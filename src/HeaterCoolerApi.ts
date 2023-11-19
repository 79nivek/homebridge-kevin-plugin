import { AccessoryConfig, Logging } from "homebridge";
import axios, { AxiosInstance } from "axios";
import { ACMode } from "./HeaterCoolerAccessory";

export class ACApi {
  private readonly axiosInstance: AxiosInstance;

  constructor(
    private readonly config: AccessoryConfig,
    private readonly log: Logging
  ) {
    this.log.info("ACApi", config);
    this.axiosInstance = axios.create({
      baseURL: this.config["baseURLApi"],
      timeout: 5000,
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": this.config["apiKey"],
      },
    });
  }

  setMode = async (mode: ACMode) => {
    try {
      const res = await this.axiosInstance.put("/ac/mode", {
        value: mode,
      });
      this.log.info("set mode", res.data);
    } catch (err) {
      this.log.error("set mode", err);
    }
  };

  getMode = async () => {
    try {
      const res = await this.axiosInstance.get("/ac/mode");

      this.log.info("[API] getMode", res.data);

      const value = +res.data.value;
      if (value < 0 || value > 3) {
        this.log.error("Invalid mode value");
        return 0;
      }

      return value;
    } catch (err) {
      this.log.error("getMode", err);
      return 0;
    }
  };

  setTemperature = async (temperature: number) => {
    try {
      const res = await this.axiosInstance.put("/ac/temperature", {
        value: temperature,
      });

      this.log.info("syncTemperature", res.data);
    } catch (err) {
      this.log.error("syncTemperature", err);
    }
  };

  getTemperature = async () => {
    try {
      const res = await this.axiosInstance.get("/ac/temperature");

      this.log.info("[API] getTemperature", res.data);

      const value = +res.data.value;
      if (value < 16 || value > 30) {
        this.log.error("Invalid temperature value");
        return 16;
      }

      return value;
    } catch (err) {
      this.log.error("syncTemperature", err);
      return 16;
    }
  };

  setPower = async (power: boolean) => {
    try {
      const res = await this.axiosInstance.put("/ac/power", {
        value: power ? "on" : "off",
      });

      this.log.info("syncPower", res.data);
    } catch (err) {
      this.log.error("syncPower", err);
    }
  };

  asyncDebounce = (func: Function, wait: number) => {
    let timeout: NodeJS.Timeout;
    return async (...args: any[]) => {
      clearTimeout(timeout);
      return new Promise<void>((resolve) => {
        timeout = setTimeout(async () => {
          await func(...args);
          resolve();
        }, wait);
      });
    };
  };

  debounceSetTemperature = this.asyncDebounce(this.setTemperature, 1000);
  debounceSetMode = this.asyncDebounce(this.setMode, 1000);
  debounceSetPower = this.asyncDebounce(this.setPower, 1000);
}
