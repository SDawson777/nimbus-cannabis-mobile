const { TestEnvironment } = require('jest-environment-node');

class CustomNodeEnvironment extends TestEnvironment {
  constructor(config, context) {
    super(config, context);

    // Ensure localStorage is not attempted to be initialized
    this.global.localStorage = undefined;
    this.global.sessionStorage = undefined;
    this.global.window = undefined;
    this.global.document = undefined;

    // Set test environment variables
    this.global.process.env.NODE_ENV = 'test';
    this.global.process.env.JEST_WORKER_ID = '1';
  }

  async setup() {
    await super.setup();

    // Additional setup if needed
  }

  async teardown() {
    await super.teardown();
  }
}

module.exports = CustomNodeEnvironment;
