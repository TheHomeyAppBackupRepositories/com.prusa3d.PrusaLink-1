"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const homey_1 = __importDefault(require("homey"));
const AxiosDigestAuth_1 = require("../../Service/AxiosDigestAuth");
class PrusaLinkDevice extends homey_1.default.Device {
    constructor() {
        super(...arguments);
        this.PullIntervalSeconds = async () => {
            return +(this.getSetting("update-freq") ?? 5);
        };
        this.SetErrorState = async () => {
            await this.setCapabilityValue("alarm_connection_capability", true);
            await this.setCapabilityValue("nozzle_capability", null);
            await this.setCapabilityValue("speed_print_capability", null);
            await this.setCapabilityValue("status_capability", "Unknown");
            await this.setCapabilityValue("temperature_heatbed_capability", null);
            await this.setCapabilityValue("temperature_nozzle_capability", null);
            await this.setCapabilityValue("z_height_capability", null);
        };
        this.SetPrinterState = async (printerStatus) => {
            await this.setCapabilityValue("alarm_connection_capability", false);
            await this.setCapabilityValue("nozzle_capability", +printerStatus.printer.target_nozzle);
            await this.setCapabilityValue("speed_print_capability", +printerStatus.printer.speed);
            await this.setCapabilityValue("status_capability", printerStatus.printer.state);
            await this.setCapabilityValue("temperature_heatbed_capability", +printerStatus.printer.target_bed);
            await this.setCapabilityValue("temperature_nozzle_capability", +printerStatus.printer.temp_nozzle);
            await this.setCapabilityValue("z_height_capability", +printerStatus.printer.axis_z);
        };
        this.HandlePrinterStateChange = async (flowCard, currentState, lastKnownState) => {
            // this.log("DEBUG", "HandlePrinterStateChange", currentState, lastKnownState);
            if (currentState === lastKnownState)
                return; // No change - state the same.
            await flowCard.trigger(this, { 'state': currentState }).then(this.log).catch(this.error);
            await this.homey.notifications.createNotification({ excerpt: `Printer ${this.getName()} state changed to ${currentState}.` });
        };
    }
    /**
     * onInit is called when the device is initialized.
     */
    async onInit() {
        this.log('PrusaLinkDevice has been initialized');
        const deviceTriggerCard = this.homey.flow.getDeviceTriggerCard("printer-state-change");
        // Pull
        this.homey.setInterval(async () => {
            var userName = this.getSetting("auth-user");
            var userKey = this.getSetting("auth-password");
            var printerIp = this.getSetting("device-ip");
            //this.log("conn", userName, userKey, printerIp);
            //const client = new DigestClient(userName, userKey, { algorithm: 'MD5' });
            //client.fetch(`http://${printerIp}/api/v1/status`).then((res:any) => res.json).then(console.dir)
            const digestAuth = new AxiosDigestAuth_1.AxiosDigestAuth({
                username: userName,
                password: userKey
            });
            try {
                var data = await digestAuth.request({
                    headers: { Accept: "application/json" },
                    method: "GET",
                    url: `http://${printerIp}/api/v1/status`
                });
                var printerStatusData = data.data;
                //this.log("Read", printerStatusData);
                var currentState = (printerStatusData == null ? "Unknown" : printerStatusData.printer.state);
                var lastKnownState = this.getCapabilityValue("status_capability") ?? "Unknown";
                await this.HandlePrinterStateChange(deviceTriggerCard, currentState, lastKnownState);
                await this.SetPrinterState(printerStatusData);
            }
            catch (err) {
                //this.log("ERROR", err);
                var currentState = "Unknown";
                var lastKnownState = this.getCapabilityValue("status_capability") ?? "Unknown";
                await this.HandlePrinterStateChange(deviceTriggerCard, currentState, lastKnownState);
                await this.SetErrorState();
            }
        }, await this.PullIntervalSeconds() * 1000);
    }
    /**
     * onAdded is called when the user adds the device, called just after pairing.
     */
    async onAdded() {
        this.log('PrusaLinkDevice has been added');
    }
    /**
     * onSettings is called when the user updates the device's settings.
     * @param {object} event the onSettings event data
     * @param {object} event.oldSettings The old settings object
     * @param {object} event.newSettings The new settings object
     * @param {string[]} event.changedKeys An array of keys changed since the previous version
     * @returns {Promise<string|void>} return a custom message that will be displayed
     */
    async onSettings({ oldSettings, newSettings, changedKeys, }) {
        this.log("PrusaLinkDevice settings where changed");
    }
    /**
     * onRenamed is called when the user updates the device's name.
     * This method can be used this to synchronise the name to the device.
     * @param {string} name The new name
     */
    async onRenamed(name) {
        this.log('PrusaLinkDevice was renamed');
    }
    /**
     * onDeleted is called when the user deleted the device.
     */
    async onDeleted() {
        this.log('PrusaLinkDevice has been deleted');
    }
}
module.exports = PrusaLinkDevice;
