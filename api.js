module.exports = {
  async postCommand({ homey, body }) {
    const { command, requestId, token } = body;

    const expectedToken = (homey.settings.get('r1_token') || '').trim();
    const receivedToken = (token || '').trim();

    if (receivedToken !== expectedToken) {
      homey.app.error(`API Unauthorized! Received: [${receivedToken}], Expected: [${expectedToken}]`);
      return { status: 'error', error: 'Unauthorized' };
    }

    if (!requestId || !command) {
      return { status: 'error', error: 'Missing requestId or command' };
    }

    homey.app.log(`API postCommand called for [${requestId}]: ${command}`);

    // Trigger the flow card
    if (homey.app._flowTriggerCommandReceived) {
      homey.app._flowTriggerCommandReceived.trigger({ command: command }, { requestId: requestId })
        .then(() => homey.app.log(`Flow triggered successfully for [${requestId}]`))
        .catch(err => homey.app.error('Error triggering flow:', err));
    }

    // Wait for the response
    return new Promise((resolve) => {
      // Set a 14s timeout for the long poll
      const timer = setTimeout(() => {
        homey.app._pendingLongPolls.delete(requestId);
        homey.app.log(`Long poll timeout for [${requestId}]`);
        resolve({ status: 'timeout' });
      }, 14000);

      // Store resolver to be called by Action Card
      homey.app._pendingLongPolls.set(requestId, { resolve, timer });
    });
  },

  async getResponse({ homey, query }) {
    // Mantengo per retrocompatibilità momentanea se serve
    const requestId = query.requestId;
    const token = query.token;

    const expectedToken = (homey.settings.get('r1_token') || '').trim();
    const receivedToken = (token || '').trim();

    if (receivedToken !== expectedToken) {
      homey.app.error(`API Unauthorized! Received: [${receivedToken}], Expected: [${expectedToken}]`);
      return { status: 'error', error: 'Unauthorized' };
    }

    if (!requestId) {
      return { status: 'error', error: 'Missing requestId' };
    }

    homey.app.log(`API getResponse called for [${requestId}]`);

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        homey.app._pendingLongPolls.delete(requestId);
        homey.app.log(`Long poll timeout for [${requestId}]`);
        resolve({ status: 'timeout' });
      }, 14000);

      homey.app._pendingLongPolls.set(requestId, { resolve, timer });
    });
  },

  async getWebhookUrl({ homey }) {
    return await homey.app.getWebhookUrl();
  }
};
