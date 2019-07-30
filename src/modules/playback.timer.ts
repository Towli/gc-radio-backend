// make declaration file for nanotimer
import * as Nanotimer from 'nanotimer';

export default class Timer {
  private _nanotimer: any; // no type file for Nanotimer :(
  private _duration: number;
  private _currentSecond: number;
  private _trackingInterval: number;
  private _endCallback: any; // type callback

  constructor(duration: number, trackingInterval: number = 1000) {
    this._nanotimer = new Nanotimer();
    this._duration = duration;
    this._trackingInterval = trackingInterval;
    this._currentSecond = 0;
  }

  public get duration(): number {
    return this._duration;
  }

  public get currentSecond(): number {
    console.log('getting currentSecond: ', this._currentSecond);
    return this._currentSecond;
  }

  // type callback
  start(callback?: any) {
    this._endCallback = callback || null;
    this._nanotimer.setInterval(
      this.track,
      '',
      this.convertMsToNanotimerSeconds(this._trackingInterval)
    );
    this._nanotimer.setTimeout(
      this.end,
      [this._nanotimer],
      this.convertMsToNanotimerSeconds(this._duration)
    );
  }

  end = (timer: any) => {
    timer.clearInterval();
    this._currentSecond = 0;
    this._endCallback && this._endCallback();
  };

  track = () => {
    this._currentSecond = ++this._currentSecond;
  };

  private convertMsToNanotimerSeconds(ms: number) {
    if (!ms || isNaN(ms)) {
      throw new Error('invalid arg [ms]: not a valid number');
    }
    return `${ms / 1000}s`;
  }
}
