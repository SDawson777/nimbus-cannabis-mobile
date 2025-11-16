// src/services/complianceService.ts
import { PrismaClient, ComplianceRule } from '@prisma/client';

export interface ComplianceError {
  code: string;
  message: string;
  field?: string;
}

export interface ComplianceCheckResult {
  isValid: boolean;
  errors: ComplianceError[];
}

interface UserForCompliance {
  id: string;
  dateOfBirth: Date | null;
  ageVerified: boolean;
}

export interface OrderItem {
  productId: string;
  quantity: number;
}

export class ComplianceService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Check if a user meets age requirements for a given compliance rule
   */
  private checkAgeCompliance(user: UserForCompliance, rule: ComplianceRule): ComplianceError[] {
    const errors: ComplianceError[] = [];

    if (!rule.mustVerifyAge) {
      return errors; // Age verification not required
    }

    if (!user.ageVerified) {
      errors.push({
        code: 'AGE_NOT_VERIFIED',
        message: 'Age verification is required to complete this purchase.',
        field: 'ageVerified',
      });
      return errors;
    }

    if (!user.dateOfBirth) {
      errors.push({
        code: 'DATE_OF_BIRTH_MISSING',
        message: 'Date of birth is required for age verification.',
        field: 'dateOfBirth',
      });
      return errors;
    }

    const age = this.calculateAge(user.dateOfBirth);
    if (age < rule.minAge) {
      errors.push({
        code: 'UNDERAGE',
        message: `You must be at least ${rule.minAge} years old to make a purchase.`,
        field: 'age',
      });
    }

    return errors;
  }

  /**
   * Calculate age from date of birth
   */
  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  /**
   * Calculate total THC mg for an order
   */
  private async calculateOrderTHCMg(items: OrderItem[]): Promise<number> {
    let totalTHCMg = 0;

    for (const item of items) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
        select: { thcMgPerUnit: true, thcPercent: true },
      });

      if (product) {
        let thcMgPerUnit = product.thcMgPerUnit;

        // If thcMgPerUnit is not set, calculate from thcPercent (fallback)
        // Assume 1g = 1000mg, so 20% THC = 200mg per gram
        if (!thcMgPerUnit && product.thcPercent) {
          thcMgPerUnit = (product.thcPercent / 100) * 1000; // mg per gram
        }

        if (thcMgPerUnit) {
          totalTHCMg += thcMgPerUnit * item.quantity;
        }
      }
    }

    return totalTHCMg;
  }

  /**
   * Check daily THC limits for a user
   */
  private async checkTHCLimits(
    userId: string,
    orderTHCMg: number,
    rule: ComplianceRule
  ): Promise<ComplianceError[]> {
    const errors: ComplianceError[] = [];

    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    // Find all completed orders for today
    const todaysOrders = await this.prisma.order.findMany({
      where: {
        userId,
        status: {
          in: ['CONFIRMED', 'READY', 'COMPLETED'], // Don't count cancelled orders
        },
        createdAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: { thcMgPerUnit: true, thcPercent: true },
            },
          },
        },
      },
    });

    // Calculate existing THC consumption for today
    let existingTHCMg = 0;
    for (const order of todaysOrders) {
      for (const item of order.items) {
        let thcMgPerUnit = item.product.thcMgPerUnit;

        // Fallback calculation if thcMgPerUnit is not set
        if (!thcMgPerUnit && item.product.thcPercent) {
          thcMgPerUnit = (item.product.thcPercent / 100) * 1000;
        }

        if (thcMgPerUnit) {
          existingTHCMg += thcMgPerUnit * item.quantity;
        }
      }
    }

    const totalTHCMg = existingTHCMg + orderTHCMg;

    if (totalTHCMg > rule.maxDailyTHCMg) {
      const remaining = rule.maxDailyTHCMg - existingTHCMg;
      errors.push({
        code: 'DAILY_THC_LIMIT_EXCEEDED',
        message: `This order would exceed the daily THC limit of ${rule.maxDailyTHCMg}mg. You have ${Math.max(0, remaining)}mg remaining today.`,
        field: 'thcLimit',
      });
    }

    return errors;
  }

  /**
   * Get compliance rule for a state
   */
  private async getComplianceRule(stateCode: string): Promise<ComplianceRule | null> {
    return await this.prisma.complianceRule.findUnique({
      where: { stateCode: stateCode.toUpperCase() },
    });
  }

  /**
   * Main compliance check function
   */
  async checkOrderCompliance(
    userId: string,
    storeId: string,
    items: OrderItem[]
  ): Promise<ComplianceCheckResult> {
    try {
      // Get user details
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          dateOfBirth: true,
          ageVerified: true,
        },
      });

      if (!user) {
        return {
          isValid: false,
          errors: [{ code: 'USER_NOT_FOUND', message: 'User not found.' }],
        };
      }

      // Get store details to determine state
      const store = await this.prisma.store.findUnique({
        where: { id: storeId },
        select: { state: true },
      });

      if (!store || !store.state) {
        return {
          isValid: false,
          errors: [
            {
              code: 'STORE_STATE_UNKNOWN',
              message: 'Store location is required for compliance checking.',
            },
          ],
        };
      }

      // Get compliance rule for the state
      const rule = await this.getComplianceRule(store.state);

      if (!rule) {
        // If no specific rule exists, allow the order (default permissive behavior)
        console.warn(`No compliance rule found for state: ${store.state}`);
        return { isValid: true, errors: [] };
      }

      const errors: ComplianceError[] = [];

      // Check age compliance
      const ageErrors = this.checkAgeCompliance(user, rule);
      errors.push(...ageErrors);

      // Check THC limits
      const orderTHCMg = await this.calculateOrderTHCMg(items);
      const thcErrors = await this.checkTHCLimits(userId, orderTHCMg, rule);
      errors.push(...thcErrors);

      return {
        isValid: errors.length === 0,
        errors,
      };
    } catch (error) {
      console.error('Compliance check error:', error);
      return {
        isValid: false,
        errors: [
          {
            code: 'COMPLIANCE_CHECK_ERROR',
            message: 'Unable to verify compliance. Please try again.',
          },
        ],
      };
    }
  }
}
