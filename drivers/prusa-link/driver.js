"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const homey_1 = __importDefault(require("homey"));
class PrusaLinkDriver extends homey_1.default.Driver {
    /**
     * onInit is called when the driver is initialized.
     */
    async onInit() {
        this.log('PrusaLinkDriver has been initialized');
    }
    async onPairListDevices() {
        const timestamp = new Date().getTime();
        return [
            {
                name: 'Prusa Link',
                data: {
                    id: `PrusaLinkDevice_${timestamp}`
                }
            },
        ];
    }
}
module.exports = PrusaLinkDriver;
