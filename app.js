const Homey = require('homey');

class App extends Homey.App {
  async onInit() {
    this.log('Rabbit R1 Integration has been initialized');

    // Generate token if not exists
    let token = this.homey.settings.get('r1_token');
    if (!token) {
      const crypto = require('crypto');
      token = crypto.randomBytes(16).toString('hex');
      this.homey.settings.set('r1_token', token);
      this.log('Generated new R1 security token');
    }

    // Pending long polling requests map
    // Map<requestId, { resolve, timer }>
    this._pendingLongPolls = new Map();

    // Register Flow Cards
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // Trigger Card
    this._flowTriggerCommandReceived = this.homey.flow.getTriggerCard('command_received');

    // Action Card
    this.homey.flow.getActionCard('send_response')
      .registerRunListener(async (args, state) => {
        const responseText = args.response_text;
        const requestId = state.requestId;

        if (!requestId) {
          this.log('send_response action executed but no requestId in state');
          return true; 
        }

        this.log(`Sending response for [${requestId}]: ${responseText}`);

        // Resolve pending long poll if it exists
        const pendingPoll = this._pendingLongPolls.get(requestId);
        if (pendingPoll) {
          clearTimeout(pendingPoll.timer);
          this._pendingLongPolls.delete(requestId);
          pendingPoll.resolve({ response: responseText });
          this.log(`Resolved long poll for [${requestId}]`);
        } else {
          this.log(`No active long poll found for [${requestId}]. It might have timed out or not connected yet.`);
        }

        return true;
      });
  }
}

module.exports = App;
