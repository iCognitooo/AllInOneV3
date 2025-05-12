const { claimTicket } = require("../utils/ticket-manager")

module.exports = {
  customId: "claim-ticket",
  async execute(interaction) {
    await claimTicket(interaction)
  },
}
