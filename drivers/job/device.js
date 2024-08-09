"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const homey_1 = __importDefault(require("homey"));
const AxiosDigestAuth_1 = require("../../Service/AxiosDigestAuth");
const NULL_JOB = "No Job";
class PrinterJobDevice extends homey_1.default.Device {
    constructor() {
        super(...arguments);
        this.PullIntervalSeconds = async () => {
            return +(this.getSetting("update-freq") ?? 5);
        };
        this.SetJobErrorState = async () => {
            await this.setCapabilityValue("alarm_connection_capability", true);
            await this.setCapabilityValue("status_capability", NULL_JOB);
            await this.setCapabilityValue("time_printing_capability", null);
            await this.setCapabilityValue("time_remaining_capability", null);
            await this.setCapabilityValue("job_progress_capability", 0);
            await this.setCapabilityValue("job_name_capability", null);
        };
        this.SetPrinterJobState = async (printerJob) => {
            await this.setCapabilityValue("alarm_connection_capability", false);
            await this.setCapabilityValue("status_capability", printerJob == null ? NULL_JOB : (printerJob.state ?? NULL_JOB));
            if (printerJob != null && printerJob != undefined && printerJob != '') {
                await this.setCapabilityValue("time_printing_capability", Math.floor(((+printerJob.time_printing) || 0) / 60));
                await this.setCapabilityValue("time_remaining_capability", Math.floor(((+printerJob.time_remaining) || 0) / 60));
                await this.setCapabilityValue("job_progress_capability", +printerJob.progress);
                await this.setCapabilityValue("job_name_capability", printerJob.file.display_name);
            }
            else {
                await this.setCapabilityValue("time_printing_capability", null);
                await this.setCapabilityValue("time_remaining_capability", null);
                //await this.setCapabilityValue("job_progress_capability", null); // keep last state
                await this.setCapabilityValue("job_name_capability", NULL_JOB);
            }
        };
        this.HandleJobStateChange = async (flowCard, currentState, lastKnownState) => {
            // this.log("DEBUG", "HandleJobStateChange", currentState, lastKnownState);
            if (currentState === lastKnownState)
                return; // No change - state the same.
            await flowCard.trigger(this, { 'state': currentState ?? NULL_JOB }).then(this.log).catch(this.error);
            await this.homey.notifications.createNotification({ excerpt: `Job ${this.getName()} state changed to ${currentState}.` });
        };
        this.HandleJobPercentageChange = async (flowCard, currentPercentage, lastKnownPercentage) => {
            // this.log("DEBUG", "HandleJobPercentageChange", currentPercentage, lastKnownPercentage);
            if (currentPercentage === lastKnownPercentage)
                return; // No change - state the same.
            await flowCard.trigger(this, { 'percentage': currentPercentage ?? 0 }).then(this.log).catch(this.error);
        };
    }
    /**
     * onInit is called when the device is initialized.
     */
    async onInit() {
        this.log('PrinterJobDevice has been initialized');
        const jobStateTriggerCard = this.homey.flow.getDeviceTriggerCard("job-state-change");
        const jobPercentageTriggerCard = this.homey.flow.getDeviceTriggerCard("job-percentage-changed");
        // Pull
        this.homey.setInterval(async () => {
            var userName = this.getSetting("auth-user");
            var userKey = this.getSetting("auth-password");
            var printerIp = this.getSetting("device-ip");
            const digestAuth = new AxiosDigestAuth_1.AxiosDigestAuth({
                username: userName,
                password: userKey
            });
            try {
                var data = await digestAuth.request({
                    headers: { Accept: "application/json" },
                    method: "GET",
                    url: `http://${printerIp}/api/v1/job`
                });
                var printerJobData = data.data;
                var currentState = printerJobData == null ? NULL_JOB : printerJobData.state;
                var lastKnownState = this.getCapabilityValue("status_capability");
                var currentPercentage = printerJobData == null ? 0 : printerJobData.progress;
                var lastKnownPercentage = this.getCapabilityValue("job_progress_capability") ?? 0;
                await this.HandleJobStateChange(jobStateTriggerCard, currentState ?? NULL_JOB, lastKnownState ?? NULL_JOB);
                await this.HandleJobPercentageChange(jobPercentageTriggerCard, currentPercentage ?? 0, lastKnownPercentage ?? 0);
                await this.SetPrinterJobState(printerJobData);
            }
            catch (err) {
                // this.log("ERROR", err);
                var currentState = NULL_JOB;
                var lastKnownState = this.getCapabilityValue("status_capability");
                await this.HandleJobStateChange(jobStateTriggerCard, currentState ?? NULL_JOB, lastKnownState ?? NULL_JOB);
                await this.SetJobErrorState();
            }
        }, await this.PullIntervalSeconds() * 1000);
    }
    /**
     * onAdded is called when the user adds the device, called just after pairing.
     */
    async onAdded() {
        this.log('PrinterJobDevice has been added');
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
        this.log("PrinterJobDevice settings where changed");
    }
    /**
     * onRenamed is called when the user updates the device's name.
     * This method can be used this to synchronise the name to the device.
     * @param {string} name The new name
     */
    async onRenamed(name) {
        this.log('PrinterJobDevice was renamed');
    }
    /**
     * onDeleted is called when the user deleted the device.
     */
    async onDeleted() {
        this.log('PrinterJobDevice has been deleted');
    }
}
module.exports = PrinterJobDevice;
