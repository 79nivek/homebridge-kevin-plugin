import {
  Service,
  CharacteristicValue,
  AccessoryConfig,
  Logging,
  API,
  AccessoryPlugin,
} from 'homebridge';
import { ACApi } from './HeaterCoolerApi';

export enum ACMode {
  OFF = 0,
  HEAT = 1,
  COOL = 2,
  AUTO = 3,
}

export enum ToshibaACMode {
  AUTO = 0,
  OFF = 7,
  COOL = 1,
  DRY = 2,
  FAN = 4,
  HEAT = 3,
}

class CacheItem<T = unknown> {
  private ttl: number;
  // cache time is 30s (30 * 1000) in milliseconds
  private cacheTime = 1000 * 30;

  constructor(
    private value: T,
    private callback?: {
      setter?: (value: T) => Promise<void>;
      getter?: () => Promise<T>;
    }
  ) {
    this.ttl = Date.now() + this.cacheTime;
  }

  isExpired() {
    return Date.now() > this.ttl;
  }

  async getValue() {
    if (this.isExpired()) {
      if (this.callback?.getter) {
        this.value = await this.callback.getter();
        this.ttl = Date.now() + this.cacheTime;
      }
    }

    return this.value;
  }

  setData(value: T) {
    this.value = value;
    this.ttl = Date.now() + this.cacheTime;

    if (this.callback?.setter) {
      this.callback.setter(value);
    }
  }
}

export class AcAccessory implements AccessoryPlugin {
  private service: Service;
  private intervalRef: NodeJS.Timeout | undefined;

  private stage: {
    On: CacheItem<boolean>;
    currentTemperature: CacheItem<number>;
    targetTemperature: CacheItem<number>;
    currentMode: CacheItem<ACMode>;
    targetMode: CacheItem<ACMode>;
  };

  private readonly acApi: ACApi;

  constructor(
    private readonly log: Logging,
    private readonly config: AccessoryConfig,
    private readonly api: API
  ) {
    this.acApi = new ACApi(config, log);

    this.stage = {
      On: new CacheItem(false, {
        setter: (value) => {
          return this.acApi.debounceSetPower(value);
        },
      }),
      currentTemperature: new CacheItem(22, {
        getter: () => {
          return this.stage.targetTemperature.getValue();
        },
      }),
      targetTemperature: new CacheItem(22, {
        getter: () => {
          return this.acApi.getTemperature();
        },
        setter: (value) => {
          return this.acApi.debounceSetTemperature(value);
        },
      }),
      currentMode: new CacheItem(ACMode.COOL, {
        getter: () => {
          return this.stage.targetMode.getValue();
        },
      }),
      targetMode: new CacheItem(ACMode.COOL, {
        getter: this.acApi.getMode.bind(this.acApi),
        setter: this.acApi.debounceSetMode.bind(this.acApi),
      }),
    };

    // create a new AC accessory
    const accessory = new api.platformAccessory(
      config.name,
      api.hap.uuid.generate(config.name)
    );

    this.log.info('config', config);

    // create the AC service
    this.service = accessory.addService(api.hap.Service.Thermostat, 'AC');

    // create handlers for required characteristics
    this.service
      .getCharacteristic(api.hap.Characteristic.Active)
      .onGet(this.handleActiveGet.bind(this))
      .onSet(this.handleActiveSet.bind(this));

    this.service
      .getCharacteristic(api.hap.Characteristic.CurrentTemperature)
      .onGet(this.handleGetCurrentTemperature.bind(this))
      .setProps({
        minValue: 20,
        maxValue: 30,
        minStep: 0.1,
      });

    this.service
      .getCharacteristic(api.hap.Characteristic.TargetTemperature)
      .onGet(this.handleGetTargetTemperature.bind(this))
      .onSet(this.handleSetTargetTemperature.bind(this))
      .setProps({
        minValue: 20,
        maxValue: 30,
        minStep: 0.1,
      });

    this.service
      .getCharacteristic(api.hap.Characteristic.TargetHeatingCoolingState)
      .onGet(this.handleGetTargetMode.bind(this))
      .onSet(this.handleSetTargetMode.bind(this));

    this.service
      .getCharacteristic(api.hap.Characteristic.CurrentHeatingCoolingState)
      .onGet(this.handleGetCurrentMode.bind(this));
  }

  getServices(): Service[] {
    return [this.service];
  }

  /**
   * Handle requests to get the current value of the "On" characteristic
   */
  private handleActiveGet(): Promise<CharacteristicValue> {
    this.log.debug('GET Active');
    return this.stage.On.getValue();
  }

  /**
   * Handle requests to set the "On" characteristic
   */
  private handleActiveSet(value: CharacteristicValue) {
    this.log.info('SET Active:', value);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    this.stage.On;

    if (this.stage.On) {
      this.log.info('AC is on');
    } else {
      this.log.info('AC is off');
    }
  }

  /**
   * Handle requests to get the current value of the "Current Temperature" characteristic
   */
  private handleGetCurrentTemperature(): Promise<CharacteristicValue> {
    this.log.debug('GET CurrentTemperature');
    return this.stage.currentTemperature.getValue();
  }

  /**
   * Handle requests to get the current value of the "Target Temperature" characteristic
   */
  private handleGetTargetTemperature(): Promise<CharacteristicValue> {
    this.log.debug('GET TargetHeaterCoolerTemperature');
    return this.stage.targetTemperature.getValue();
  }

  /**
   * Handle requests to set the "Target Temperature" characteristic
   */
  private async handleSetTargetTemperature(value: CharacteristicValue) {
    this.log.info('SET TargetHeaterCoolerTemperature:', value);
    this.stage.targetTemperature.setData(Number(value));

    this.log.info(
      'AC target temperature:',
      this.stage.targetTemperature.getValue()
    );

    // update the current value
    this.service.updateCharacteristic(
      this.api.hap.Characteristic.TargetTemperature,
      await this.stage.targetTemperature.getValue()
    );

    this.visualizeCurrentTemperatureChange();
  }

  private visualizeCurrentTemperatureChange() {
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
    }

    this.intervalRef = setInterval(async () => {
      if (
        (await this.stage.currentTemperature.getValue()) >
        (await this.stage.targetTemperature.getValue())
      ) {
        await this.stage.currentTemperature.setData(
          Number(
            ((await this.stage.currentTemperature.getValue()) - 0.1).toFixed(1)
          )
        );
      }

      if (
        (await this.stage.currentTemperature.getValue()) <
        (await this.stage.targetTemperature.getValue())
      ) {
        await this.stage.currentTemperature.setData(
          Number(
            ((await this.stage.currentTemperature.getValue()) + 0.1).toFixed(1)
          )
        );
      }

      if (
        (await this.stage.currentTemperature.getValue()) ===
        (await this.stage.targetTemperature.getValue())
      ) {
        clearInterval(this.intervalRef);
      }

      this.log.info(
        'AC current temperature:',
        await this.stage.currentTemperature.getValue()
      );

      // update the current value
      this.service.updateCharacteristic(
        this.api.hap.Characteristic.CurrentTemperature,
        await this.stage.currentTemperature.getValue()
      );
    }, 999);
  }

  /**
   * Handle requests to get the current value of the "Target Heating Cooling State" characteristic
   */
  private async handleGetTargetMode(): Promise<CharacteristicValue> {
    this.log.debug('GET TargetHeatingCoolingState');
    return await this.stage.targetMode.getValue();
  }

  /**
   * Handle requests to set the "Target Heating Cooling State" characteristic
   */
  private async handleSetTargetMode(value: CharacteristicValue) {
    this.log.info('SET TargetMode:', value);

    this.stage.targetMode.setData(value as ACMode);

    this.stage.currentMode = this.stage.targetMode;

    this.log.info('AC target mode:', await this.stage.targetMode.getValue());

    // update the current value
    this.service.updateCharacteristic(
      this.api.hap.Characteristic.TargetHeatingCoolingState,
      await this.stage.targetMode.getValue()
    );

    if ((await this.stage.targetMode.getValue()) === ACMode.OFF) {
      this.stage.On.setData(false);

      // clear interval
      if (this.intervalRef) {
        clearInterval(this.intervalRef);
      }
    } else {
      this.stage.On.setData(true);
    }

    // update the current value
    this.service.updateCharacteristic(
      this.api.hap.Characteristic.Active,
      await this.stage.On.getValue()
    );

    this.visualizeCurrentTemperatureChange();
  }

  /**
   * Handle requests to get the current value of the "Current Heating Cooling State" characteristic
   */

  private async handleGetCurrentMode(): Promise<CharacteristicValue> {
    this.log.debug('GET CurrentHeatingCoolingState');
    return await this.stage.currentMode.getValue();
  }
}
