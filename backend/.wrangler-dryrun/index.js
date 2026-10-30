var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
// @__NO_SIDE_EFFECTS__
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw /* @__PURE__ */ createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
// @__NO_SIDE_EFFECTS__
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// ../node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  static {
    __name(this, "PerformanceEntry");
  }
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
var PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
  static {
    __name(this, "PerformanceMark");
  }
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
};
var PerformanceMeasure = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceMeasure");
  }
  entryType = "measure";
};
var PerformanceResourceTiming = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceResourceTiming");
  }
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
var PerformanceObserverEntryList = class {
  static {
    __name(this, "PerformanceObserverEntryList");
  }
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
var Performance = class {
  static {
    __name(this, "Performance");
  }
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
var PerformanceObserver = class {
  static {
    __name(this, "PerformanceObserver");
  }
  __unenv__ = true;
  static supportedEntryTypes = [];
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// ../node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
if (!("__unenv__" in performance)) {
  const proto = Performance.prototype;
  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key !== "constructor" && !(key in performance)) {
      const desc = Object.getOwnPropertyDescriptor(proto, key);
      if (desc) {
        Object.defineProperty(performance, key, desc);
      }
    }
  }
}
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// ../node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// ../node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// ../node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// ../node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// ../node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// ../node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// ../node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// ../node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream = class {
  static {
    __name(this, "ReadStream");
  }
  fd;
  isRaw = false;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
};

// ../node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream = class {
  static {
    __name(this, "WriteStream");
  }
  fd;
  columns = 80;
  rows = 24;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  clearLine(dir3, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env2) {
    return 1;
  }
  hasColors(count3, env2) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  write(str, encoding, cb) {
    if (str instanceof Uint8Array) {
      str = new TextDecoder().decode(str);
    }
    try {
      console.log(str);
    } catch {
    }
    cb && typeof cb === "function" && cb();
    return false;
  }
};

// ../node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION = "22.14.0";

// ../node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class _Process extends EventEmitter {
  static {
    __name(this, "Process");
  }
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(_Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  // --- event emitter ---
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  // --- stdio (lazy initializers) ---
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  // --- cwd ---
  #cwd = "/";
  chdir(cwd2) {
    this.#cwd = cwd2;
  }
  cwd() {
    return this.#cwd;
  }
  // --- dummy props and getters ---
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return `v${NODE_VERSION}`;
  }
  get versions() {
    return { node: NODE_VERSION };
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  // --- noop methods ---
  ref() {
  }
  unref() {
  }
  // --- unimplemented methods ---
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  // --- attached interfaces ---
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: /* @__PURE__ */ __name(() => 0, "rss") });
  // --- undefined props ---
  mainModule = void 0;
  domain = void 0;
  // optional
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  // internals
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};

// ../node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var workerdProcess = getBuiltinModule("node:process");
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  // `nextTick` is available from workerd process v1
  nextTick: workerdProcess.nextTick
});
var { exit, features, platform } = workerdProcess;
var {
  _channel,
  _debugEnd,
  _debugProcess,
  _disconnect,
  _events,
  _eventsCount,
  _exiting,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _handleQueue,
  _kill,
  _linkedBinding,
  _maxListeners,
  _pendingMessage,
  _preload_modules,
  _rawDebug,
  _send,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  arch,
  argv,
  argv0,
  assert: assert2,
  availableMemory,
  binding,
  channel,
  chdir,
  config,
  connected,
  constrainedMemory,
  cpuUsage,
  cwd,
  debugPort,
  disconnect,
  dlopen,
  domain,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exitCode,
  finalization,
  getActiveResourcesInfo,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getMaxListeners,
  getuid,
  hasUncaughtExceptionCaptureCallback,
  hrtime: hrtime3,
  initgroups,
  kill,
  listenerCount,
  listeners,
  loadEnvFile,
  mainModule,
  memoryUsage,
  moduleLoadList,
  nextTick,
  off,
  on,
  once,
  openStdin,
  permission,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  reallyExit,
  ref,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  send,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setMaxListeners,
  setSourceMapsEnabled,
  setuid,
  setUncaughtExceptionCaptureCallback,
  sourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  throwDeprecation,
  title,
  traceDeprecation,
  umask,
  unref,
  uptime,
  version,
  versions
} = unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// ../node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// ../node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// ../node_modules/hono/dist/utils/buffer.js
var bufferToFormData = /* @__PURE__ */ __name((arrayBuffer, contentType) => {
  return new Response(arrayBuffer, { headers: { "Content-Type": contentType.replace(/^[^;]+/, (mediaType) => mediaType.toLowerCase()) } }).formData();
}, "bufferToFormData");

// ../node_modules/hono/dist/utils/body.js
var MAX_NESTED_OBJECTS = 1e4;
var isRawRequest = /* @__PURE__ */ __name((request) => "headers" in request, "isRawRequest");
var parseBody = /* @__PURE__ */ __name(async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const mediaType = (isRawRequest(request) ? request.headers : request.raw.headers).get("Content-Type")?.split(";")[0].trim().toLowerCase();
  if (mediaType === "multipart/form-data" || mediaType === "application/x-www-form-urlencoded") return parseFormData(request, {
    all,
    dot
  });
  return {};
}, "parseBody");
async function parseFormData(request, options) {
  if (!isRawRequest(request) && request.bodyCache.formData) return convertFormDataToBodyData(await request.bodyCache.formData, options);
  const headers = isRawRequest(request) ? request.headers : request.raw.headers;
  const arrayBuffer = await request.arrayBuffer();
  const formDataPromise = bufferToFormData(arrayBuffer, headers.get("Content-Type") || "");
  if (!isRawRequest(request)) request.bodyCache.formData = formDataPromise;
  const formData = await formDataPromise;
  if (formData) return convertFormDataToBodyData(formData, options);
  return {};
}
__name(parseFormData, "parseFormData");
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  const nestingState = { count: 0 };
  formData.forEach((value, key) => {
    if (!(options.all || key.endsWith("[]"))) form[key] = value;
    else handleParsingAllValues(form, key, value);
  });
  if (options.dot) Object.entries(form).forEach(([key, value]) => {
    if (key.includes(".")) {
      handleParsingNestedValues(form, key, value, nestingState);
      delete form[key];
    }
  });
  return form;
}
__name(convertFormDataToBodyData, "convertFormDataToBodyData");
var handleParsingAllValues = /* @__PURE__ */ __name((form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) form[key].push(value);
    else form[key] = [form[key], value];
  } else if (!key.endsWith("[]")) form[key] = value;
  else form[key] = [value];
}, "handleParsingAllValues");
var handleParsingNestedValues = /* @__PURE__ */ __name((form, key, value, state) => {
  if (/(?:^|\.)__proto__\./.test(key)) return;
  let nestedForm = form;
  const keys = key.split(".", 34);
  if (keys.length > 33) throwNestingLimitExceeded();
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) nestedForm[key2] = value;
    else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        if (state.count++ >= MAX_NESTED_OBJECTS) throwNestingLimitExceeded();
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
}, "handleParsingNestedValues");
var throwNestingLimitExceeded = /* @__PURE__ */ __name(() => {
  throw new Error("Nesting limit exceeded");
}, "throwNestingLimitExceeded");

// ../node_modules/hono/dist/utils/url.js
var splitPath = /* @__PURE__ */ __name((path) => {
  const paths = path.split("/");
  if (paths[0] === "") paths.shift();
  return paths;
}, "splitPath");
var splitRoutingPath = /* @__PURE__ */ __name((routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
}, "splitRoutingPath");
var extractGroupsFromPath = /* @__PURE__ */ __name((path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return {
    groups,
    path
  };
}, "extractGroupsFromPath");
var replaceGroupMarks = /* @__PURE__ */ __name((paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) if (paths[j].includes(mark)) {
      paths[j] = paths[j].replace(mark, groups[i][1]);
      break;
    }
  }
  return paths;
}, "replaceGroupMarks");
var patternCache = {};
var getPattern = /* @__PURE__ */ __name((label, next) => {
  if (label === "*") return "*";
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [
        cacheKey,
        match2[1],
        new RegExp(`^${match2[2]}(?=/${next})`)
      ] : [
        label,
        match2[1],
        new RegExp(`^${match2[2]}$`)
      ];
      else patternCache[cacheKey] = [
        label,
        match2[1],
        true
      ];
    }
    return patternCache[cacheKey];
  }
  return null;
}, "getPattern");
var tryDecode = /* @__PURE__ */ __name((str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
}, "tryDecode");
var tryDecodeURI = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURI), "tryDecodeURI");
var getPath = /* @__PURE__ */ __name((request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const hashIndex = url.indexOf("#", i);
      const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
      const path = url.slice(start, end);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63 || charCode === 35) break;
  }
  return url.slice(start, i);
}, "getPath");
var getPathNoStrict = /* @__PURE__ */ __name((request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
}, "getPathNoStrict");
var mergePath = /* @__PURE__ */ __name((base, sub, ...rest) => {
  if (rest.length) sub = mergePath(sub, ...rest);
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
}, "mergePath");
var checkOptionalParameter = /* @__PURE__ */ __name((path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) return null;
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) basePath += "/" + segment;
    else if (/\:/.test(segment)) {
      if (segment.charCodeAt(segment.length - 1) === 63) {
        if (results.length === 0 && basePath === "") results.push("/");
        else results.push(basePath);
        const optionalSegment = segment.slice(0, -1);
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else basePath += "/" + segment;
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
}, "checkOptionalParameter");
var tryDecodeURIComponent = /* @__PURE__ */ __name((str) => str.indexOf("%") !== -1 ? tryDecode(str, decodeURIComponent_) : str, "tryDecodeURIComponent");
var _decodeURI = /* @__PURE__ */ __name((value) => {
  if (value.indexOf("+") !== -1) value = value.replace(/\+/g, " ");
  return tryDecodeURIComponent(value);
}, "_decodeURI");
var _getQueryParam = /* @__PURE__ */ __name((url, key, multiple) => {
  const hashIndex = url.indexOf("#", 8);
  if (hashIndex !== -1) url = url.slice(0, hashIndex);
  let encoded;
  if (!multiple && key && key.indexOf("%") === -1 && key.indexOf("+") === -1) {
    const queryIndex = url.indexOf("?", 8);
    let keyIndex2 = queryIndex;
    if (keyIndex2 === -1) return;
    if (!url.startsWith(key, keyIndex2 + 1)) keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61 || trailingKeyCode === 38 || isNaN(trailingKeyCode)) {
        if (keyIndex2 > queryIndex && /(?:^|&)[^=&]*[%+]/.test(url.slice(queryIndex + 1, keyIndex2))) break;
        if (trailingKeyCode === 61) {
          const valueIndex = keyIndex2 + key.length + 2;
          const endIndex = url.indexOf("&", valueIndex);
          return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
        }
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) return;
  }
  const results = /* @__PURE__ */ Object.create(null);
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) valueIndex = -1;
    let name = url.slice(keyIndex + 1, valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex);
    if (encoded) name = _decodeURI(name);
    keyIndex = nextKeyIndex;
    if (name === "") continue;
    let value;
    if (valueIndex === -1) value = "";
    else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) value = _decodeURI(value);
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) results[name] = [];
      results[name].push(value);
    } else results[name] ??= value;
  }
  return key ? results[key] : results;
}, "_getQueryParam");
var getQueryParam = _getQueryParam;
var getQueryParams = /* @__PURE__ */ __name((url, key) => {
  return _getQueryParam(url, key, true);
}, "getQueryParams");
var decodeURIComponent_ = decodeURIComponent;

// ../node_modules/hono/dist/request.js
var HonoRequest = class {
  static {
    __name(this, "HonoRequest");
  }
  /**
  * `.raw` can get the raw Request object.
  *
  * @see {@link https://hono.dev/docs/api/request#raw}
  *
  * @example
  * ```ts
  * // For Cloudflare Workers
  * app.post('/', async (c) => {
  *   const metadata = c.req.raw.cf?.hostMetadata?
  *   ...
  * })
  * ```
  */
  raw;
  #validatedData;
  #matchResult;
  routeIndex = 0;
  /**
  * `.path` can get the pathname of the request.
  *
  * @see {@link https://hono.dev/docs/api/request#path}
  *
  * @example
  * ```ts
  * app.get('/about/me', (c) => {
  *   const pathname = c.req.path // `/about/me`
  * })
  * ```
  */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex]?.[1][key];
    const param = this.#getParamValue(paramKey);
    return param && tryDecodeURIComponent(param);
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex]?.[1] ?? {});
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) decoded[key] = tryDecodeURIComponent(value);
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) return this.raw.headers.get(name) ?? void 0;
    const headerData = /* @__PURE__ */ Object.create(null);
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return parseBody(this, options);
  }
  #cachedBody = /* @__PURE__ */ __name((key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) return cachedBody;
    for (const anyCachedKey in bodyCache) return bodyCache[anyCachedKey].then((body) => {
      if (anyCachedKey === "json") body = JSON.stringify(body);
      const contentType = anyCachedKey === "formData" ? void 0 : raw2.headers.get("content-type");
      return new Response(body, { headers: contentType ? { "Content-Type": contentType } : void 0 })[key]();
    });
    return bodyCache[key] = raw2[key]();
  }, "#cachedBody");
  /**
  * `.json()` can parse Request body of type `application/json`
  *
  * @see {@link https://hono.dev/docs/api/request#json}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.json()
  * })
  * ```
  */
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  /**
  * `.text()` can parse Request body of type `text/plain`
  *
  * @see {@link https://hono.dev/docs/api/request#text}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.text()
  * })
  * ```
  */
  text() {
    return this.#cachedBody("text");
  }
  /**
  * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
  *
  * @see {@link https://hono.dev/docs/api/request#arraybuffer}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.arrayBuffer()
  * })
  * ```
  */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
  * `.bytes()` parses the request body as a `Uint8Array`.
  *
  * @see {@link https://hono.dev/docs/api/request#bytes}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.bytes()
  * })
  * ```
  */
  bytes() {
    return this.#cachedBody("arrayBuffer").then((buffer) => new Uint8Array(buffer));
  }
  /**
  * Parses the request body as a `Blob`.
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.blob();
  * });
  * ```
  * @see https://hono.dev/docs/api/request#blob
  */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
  * Parses the request body as `FormData`.
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.formData();
  * });
  * ```
  * @see https://hono.dev/docs/api/request#formdata
  */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
  * Adds validated data to the request.
  *
  * @param target - The target of the validation.
  * @param data - The validated data to add.
  */
  addValidatedData(target, data) {
    (this.#validatedData ??= {})[target] = data;
  }
  valid(target) {
    return this.#validatedData?.[target];
  }
  /**
  * `.url` can get the request url strings.
  *
  * @see {@link https://hono.dev/docs/api/request#url}
  *
  * @example
  * ```ts
  * app.get('/about/me', (c) => {
  *   const url = c.req.url // `http://localhost:8787/about/me`
  *   ...
  * })
  * ```
  */
  get url() {
    return this.raw.url;
  }
  /**
  * `.method` can get the method name of the request.
  *
  * @see {@link https://hono.dev/docs/api/request#method}
  *
  * @example
  * ```ts
  * app.get('/about/me', (c) => {
  *   const method = c.req.method // `GET`
  * })
  * ```
  */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
  * `.matchedRoutes` can return a matched route in the handler
  *
  * @deprecated
  *
  * Use matchedRoutes helper defined in "hono/route" instead.
  *
  * @see {@link https://hono.dev/docs/api/request#matchedroutes}
  *
  * @example
  * ```ts
  * app.use('*', async function logger(c, next) {
  *   await next()
  *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
  *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
  *     console.log(
  *       method,
  *       ' ',
  *       path,
  *       ' '.repeat(Math.max(10 - path.length, 0)),
  *       name,
  *       i === c.req.routeIndex ? '<- respond from here' : ''
  *     )
  *   })
  * })
  * ```
  */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
  * `.routePath` can retrieve the path registered within the handler
  *
  * @deprecated
  *
  * Use routePath helper defined in "hono/route" instead.
  *
  * @see {@link https://hono.dev/docs/api/request#routepath}
  *
  * @example
  * ```ts
  * app.get('/posts/:id', (c) => {
  *   return c.json({ path: c.req.routePath })
  * })
  * ```
  */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// ../node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = /* @__PURE__ */ __name((value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
}, "raw");
var resolveCallback = /* @__PURE__ */ __name(async (str, phase, preserveCallbacks, context2, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) str = str.toString();
    if (str instanceof Promise) str = await str;
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) return Promise.resolve(str);
  if (buffer) buffer[0] += str;
  else buffer = [str];
  const resStr = Promise.all(callbacks.map((c) => c({
    phase,
    buffer,
    context: context2
  }))).then((res) => Promise.all(res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context2, buffer))).then(() => buffer[0]));
  if (preserveCallbacks) return raw(await resStr, callbacks);
  else return resStr;
}, "resolveCallback");

// ../node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = /* @__PURE__ */ __name((contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
}, "setDefaultContentType");
var createResponseInstance = /* @__PURE__ */ __name((body, init) => new Response(body, init), "createResponseInstance");
var Context = class {
  static {
    __name(this, "Context");
  }
  #rawRequest;
  #req;
  /**
  * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
  *
  * @see {@link https://hono.dev/docs/api/context#env}
  *
  * @example
  * ```ts
  * // Environment object for Cloudflare Workers
  * app.get('*', async c => {
  *   const counter = c.env.COUNTER
  * })
  * ```
  */
  env = {};
  #var;
  finalized = false;
  /**
  * `.error` can get the error object from the middleware if the Handler throws an error.
  *
  * @see {@link https://hono.dev/docs/api/context#error}
  *
  * @example
  * ```ts
  * app.use('*', async (c, next) => {
  *   await next()
  *   if (c.error) {
  *     // do something...
  *   }
  * })
  * ```
  */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
  * Creates an instance of the Context class.
  *
  * @param req - The Request object.
  * @param options - Optional configuration options for the context.
  */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
  * `.req` is the instance of {@link HonoRequest}.
  */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
  * @see {@link https://hono.dev/docs/api/context#event}
  * The FetchEvent associated with the current request.
  *
  * @throws Will throw an error if the context does not have a FetchEvent.
  */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) return this.#executionCtx;
    else throw Error("This context has no FetchEvent");
  }
  /**
  * @see {@link https://hono.dev/docs/api/context#executionctx}
  * The ExecutionContext associated with the current request.
  *
  * @throws Will throw an error if the context does not have an ExecutionContext.
  */
  get executionCtx() {
    if (this.#executionCtx) return this.#executionCtx;
    else throw Error("This context has no ExecutionContext");
  }
  /**
  * @see {@link https://hono.dev/docs/api/context#res}
  * The Response object for the current request.
  */
  get res() {
    return this.#res ||= createResponseInstance(null, { headers: this.#preparedHeaders ??= new Headers() });
  }
  /**
  * Sets the Response object for the current request.
  *
  * @param _res - The Response object to set.
  */
  set res(_res) {
    if (this.#res && _res) {
      _res = createResponseInstance(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") continue;
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) _res.headers.append("set-cookie", cookie);
        } else _res.headers.set(k, v);
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
  * `.render()` can create a response within a layout.
  *
  * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
  *
  * @example
  * ```ts
  * app.get('/', (c) => {
  *   return c.render('Hello!')
  * })
  * ```
  */
  render = /* @__PURE__ */ __name((...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  }, "render");
  /**
  * Sets the layout for the response.
  *
  * @param layout - The layout to set.
  * @returns The layout function.
  */
  setLayout = /* @__PURE__ */ __name((layout) => this.#layout = layout, "setLayout");
  /**
  * Gets the current layout for the response.
  *
  * @returns The current layout function.
  */
  getLayout = /* @__PURE__ */ __name(() => this.#layout, "getLayout");
  /**
  * `.setRenderer()` can set the layout in the custom middleware.
  *
  * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
  *
  * @example
  * ```tsx
  * app.use('*', async (c, next) => {
  *   c.setRenderer((content) => {
  *     return c.html(
  *       <html>
  *         <body>
  *           <p>{content}</p>
  *         </body>
  *       </html>
  *     )
  *   })
  *   await next()
  * })
  * ```
  */
  setRenderer = /* @__PURE__ */ __name((renderer) => {
    this.#renderer = renderer;
  }, "setRenderer");
  /**
  * `.header()` can set headers.
  *
  * @see {@link https://hono.dev/docs/api/context#header}
  *
  * @example
  * ```ts
  * app.get('/welcome', (c) => {
  *   // Set headers
  *   c.header('X-Message', 'Hello!')
  *   c.header('Content-Type', 'text/plain')
  *
  *   // Append multiple headers using the append option (e.g. Vary)
  *   c.header('Vary', 'Accept-Encoding', { append: true })
  *   c.header('Vary', 'User-Agent', { append: true })
  *
  *   return c.body('Thank you for coming')
  * })
  * ```
  */
  header = /* @__PURE__ */ __name((name, value, options) => {
    if (this.finalized) this.#res = createResponseInstance(this.#res.body, this.#res);
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) headers.delete(name);
    else if (options?.append) headers.append(name, value);
    else headers.set(name, value);
  }, "header");
  status = /* @__PURE__ */ __name((status) => {
    this.#status = status;
  }, "status");
  /**
  * `.set()` can set the value specified by the key.
  *
  * @see {@link https://hono.dev/docs/api/context#set-get}
  *
  * @example
  * ```ts
  * app.use('*', async (c, next) => {
  *   c.set('message', 'Hono is hot!!')
  *   await next()
  * })
  * ```
  */
  set = /* @__PURE__ */ __name((key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  }, "set");
  /**
  * `.get()` can use the value specified by the key.
  *
  * @see {@link https://hono.dev/docs/api/context#set-get}
  *
  * @example
  * ```ts
  * app.get('/', (c) => {
  *   const message = c.get('message')
  *   return c.text(`The message is "${message}"`)
  * })
  * ```
  */
  get = /* @__PURE__ */ __name((key) => {
    return this.#var ? this.#var.get(key) : void 0;
  }, "get");
  /**
  * `.var` can access the value of a variable.
  *
  * @see {@link https://hono.dev/docs/api/context#var}
  *
  * @example
  * ```ts
  * const result = c.var.client.oneMethod()
  * ```
  */
  get var() {
    if (!this.#var) return {};
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    let responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders;
    if (typeof arg === "object" && arg.headers) {
      responseHeaders ??= new Headers();
      for (const [key, value] of new Headers(arg.headers)) if (key === "set-cookie") responseHeaders.append(key, value);
      else responseHeaders.set(key, value);
    }
    if (headers) {
      if (!responseHeaders) {
        let count3 = 0;
        for (const k in headers) if (++count3 > 1 || typeof headers[k] !== "string") {
          responseHeaders = new Headers();
          break;
        }
      }
      if (responseHeaders) for (const k in headers) {
        const v = headers[k];
        if (typeof v === "string") responseHeaders.set(k, v);
        else {
          responseHeaders.delete(k);
          for (const v2 of v) responseHeaders.append(k, v2);
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return createResponseInstance(data, {
      status,
      headers: responseHeaders ?? headers
    });
  }
  newResponse = /* @__PURE__ */ __name((...args) => this.#newResponse(...args), "newResponse");
  /**
  * `.body()` can return the HTTP response.
  * You can set headers with `.header()` and set HTTP status code with `.status`.
  * This can also be set in `.text()`, `.json()` and so on.
  *
  * @see {@link https://hono.dev/docs/api/context#body}
  *
  * @example
  * ```ts
  * app.get('/welcome', (c) => {
  *   // Set headers
  *   c.header('X-Message', 'Hello!')
  *   c.header('Content-Type', 'text/plain')
  *   // Set HTTP status code
  *   c.status(201)
  *
  *   // Return the response body
  *   return c.body('Thank you for coming')
  * })
  * ```
  */
  body = /* @__PURE__ */ __name((data, arg, headers) => this.#newResponse(data, arg, headers), "body");
  /**
  * `.text()` can render text as `Content-Type:text/plain`.
  *
  * @see {@link https://hono.dev/docs/api/context#text}
  *
  * @example
  * ```ts
  * app.get('/say', (c) => {
  *   return c.text('Hello!')
  * })
  * ```
  */
  text = /* @__PURE__ */ __name((text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(text, arg, setDefaultContentType(TEXT_PLAIN, headers));
  }, "text");
  /**
  * `.json()` can render JSON as `Content-Type:application/json`.
  *
  * @see {@link https://hono.dev/docs/api/context#json}
  *
  * @example
  * ```ts
  * app.get('/api', (c) => {
  *   return c.json({ message: 'Hello!' })
  * })
  * ```
  */
  json = /* @__PURE__ */ __name((object, arg, headers) => {
    return this.#newResponse(JSON.stringify(object), arg, setDefaultContentType("application/json", headers));
  }, "json");
  html = /* @__PURE__ */ __name((html, arg, headers) => {
    const res = /* @__PURE__ */ __name((html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers)), "res");
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  }, "html");
  /**
  * `.redirect()` can Redirect, default status code is 302.
  *
  * @see {@link https://hono.dev/docs/api/context#redirect}
  *
  * @example
  * ```ts
  * app.get('/redirect', (c) => {
  *   return c.redirect('/')
  * })
  * app.get('/redirect-permanently', (c) => {
  *   return c.redirect('/', 301)
  * })
  * ```
  */
  redirect = /* @__PURE__ */ __name((location, status) => {
    const locationString = String(location);
    this.header("Location", !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString));
    return this.newResponse(null, status ?? 302);
  }, "redirect");
  /**
  * `.notFound()` can return the Not Found Response.
  *
  * @see {@link https://hono.dev/docs/api/context#notfound}
  *
  * @example
  * ```ts
  * app.get('/notfound', (c) => {
  *   return c.notFound()
  * })
  * ```
  */
  notFound = /* @__PURE__ */ __name(() => {
    this.#notFoundHandler ??= () => createResponseInstance();
    return this.#notFoundHandler(this);
  }, "notFound");
};

// ../node_modules/hono/dist/compose.js
var compose = /* @__PURE__ */ __name((middleware, onError, onNotFound) => {
  return (context2, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) throw new Error("next() called multiple times");
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context2.req.routeIndex = i;
      } else handler = i === middleware.length && next || void 0;
      if (handler) try {
        res = await handler(context2, () => dispatch(i + 1));
      } catch (err) {
        if (err instanceof Error && onError) {
          context2.error = err;
          res = await onError(err, context2);
          isError = true;
        } else throw err;
      }
      else if (context2.finalized === false && onNotFound) res = await onNotFound(context2);
      if (res && (context2.finalized === false || isError)) context2.res = res;
      return context2;
    }
    __name(dispatch, "dispatch");
  };
}, "compose");

// ../node_modules/hono/dist/router.js
var METHODS = [
  "get",
  "post",
  "put",
  "delete",
  "options",
  "patch",
  "query"
];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
  static {
    __name(this, "UnsupportedPathError");
  }
};

// ../node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// ../node_modules/hono/dist/hono-base.js
var notFoundHandler = /* @__PURE__ */ __name((c) => {
  return c.text("404 Not Found", 404);
}, "notFoundHandler");
var errorHandler = /* @__PURE__ */ __name((err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
}, "errorHandler");
var Hono = class Hono2 {
  static {
    __name(this, "Hono");
  }
  get;
  post;
  put;
  delete;
  options;
  patch;
  query;
  all;
  on;
  use;
  router;
  getPath;
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    [...METHODS, "all"].forEach((method) => {
      this[method] = (args1, ...args) => {
        const methodName = method.toUpperCase();
        if (typeof args1 === "string") this.#path = args1;
        else this.#addRoute(methodName, this.#path, args1);
        args.forEach((handler) => {
          this.#addRoute(methodName, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          const methodName = m.toUpperCase();
          for (const handler of handlers) this.#addRoute(methodName, this.#path, handler);
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") this.#path = arg1;
      else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute("ALL", this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new Hono2({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  errorHandler = errorHandler;
  /**
  * `.route()` allows grouping other Hono instance in routes.
  *
  * @see {@link https://hono.dev/docs/api/routing#grouping}
  *
  * @param {string} path - base Path
  * @param {Hono} app - other Hono instance
  * @returns {Hono} routed Hono instance
  *
  * @example
  * ```ts
  * const app = new Hono()
  * const app2 = new Hono()
  *
  * app2.get("/user", (c) => c.text("user"))
  * app.route("/api", app2) // GET /api/user
  * ```
  */
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) handler = r.handler;
      else {
        handler = /* @__PURE__ */ __name(async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res, "handler");
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler, r.basePath);
    });
    return this;
  }
  /**
  * `.basePath()` allows base paths to be specified.
  *
  * @see {@link https://hono.dev/docs/api/routing#base-path}
  *
  * @param {string} path - base Path
  * @returns {Hono} changed Hono instance
  *
  * @example
  * ```ts
  * const api = new Hono().basePath('/api')
  * ```
  */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
  * `.onError()` handles an error and returns a customized Response.
  *
  * @see {@link https://hono.dev/docs/api/hono#error-handling}
  *
  * @param {ErrorHandler} handler - request Handler for error
  * @returns {Hono} changed Hono instance
  *
  * @example
  * ```ts
  * app.onError((err, c) => {
  *   console.error(`${err}`)
  *   return c.text('Custom Error Message', 500)
  * })
  * ```
  */
  onError = /* @__PURE__ */ __name((handler) => {
    this.errorHandler = handler;
    return this;
  }, "onError");
  /**
  * `.notFound()` allows you to customize a Not Found Response.
  *
  * @see {@link https://hono.dev/docs/api/hono#not-found}
  *
  * @param {NotFoundHandler} handler - request handler for not-found
  * @returns {Hono} changed Hono instance
  *
  * @example
  * ```ts
  * app.notFound((c) => {
  *   return c.text('Custom 404 Message', 404)
  * })
  * ```
  */
  notFound = /* @__PURE__ */ __name((handler) => {
    this.#notFoundHandler = handler;
    return this;
  }, "notFound");
  /**
  * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
  *
  * @deprecated Use `mount()` from `hono/mount` instead. `.mount()` will be removed in v5.
  *
  * @see {@link https://hono.dev/docs/api/hono#mount}
  *
  * @param {string} path - base Path
  * @param {Function} applicationHandler - other Request Handler
  * @param {MountOptions} [options] - options of `.mount()`
  * @returns {Hono} mounted Hono instance
  *
  * @example
  * ```ts
  * import { Router as IttyRouter } from 'itty-router'
  * import { Hono } from 'hono'
  * // Create itty-router application
  * const ittyRouter = IttyRouter()
  * // GET /itty-router/hello
  * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
  *
  * const app = new Hono()
  * app.mount('/itty-router', ittyRouter.handle)
  * ```
  *
  * @example
  * ```ts
  * const app = new Hono()
  * // Send the request to another application without modification.
  * app.mount('/app', anotherApp, {
  *   replaceRequest: (req) => req,
  * })
  * ```
  */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") optionHandler = options;
      else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) replaceRequest = /* @__PURE__ */ __name((request) => request, "replaceRequest");
        else replaceRequest = options.replaceRequest;
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = this.getPath(request).slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = /* @__PURE__ */ __name(async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) return res;
      await next();
    }, "handler");
    this.#addRoute("ALL", mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler, baseRoutePath) {
    path = mergePath(this._basePath, path);
    const r = {
      basePath: baseRoutePath !== void 0 ? mergePath(this._basePath, baseRoutePath) : this._basePath,
      path,
      method,
      handler
    };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) return this.errorHandler(err, c);
    throw err;
  }
  #dispatch(request, executionCtx, env2, method) {
    if (method === "HEAD") return (async () => new Response(null, await this.#dispatch(request, executionCtx, env2, "GET")))();
    const path = this.getPath(request, { env: env2 });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env: env2,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then((resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context2 = await composed(c);
        if (!context2.finalized) throw new Error("Context is not finalized. Did you forget to return a Response object or `await next()`?");
        return context2.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
  * `.fetch()` will be entry point of your app.
  *
  * @see {@link https://hono.dev/docs/api/hono#fetch}
  *
  * @param {Request} request - request Object of request
  * @param {Env} env - env Object
  * @param {ExecutionContext} executionCtx - context of execution
  * @returns {Response | Promise<Response>} response of request
  *
  */
  fetch = /* @__PURE__ */ __name((request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  }, "fetch");
  /**
  * `.request()` is a useful method for testing.
  * You can pass a URL or pathname to send a GET request.
  * app will return a Response object.
  * ```ts
  * test('GET /hello is ok', async () => {
  *   const res = await app.request('/hello')
  *   expect(res.status).toBe(200)
  * })
  * ```
  * @see https://hono.dev/docs/api/hono#request
  */
  request = /* @__PURE__ */ __name((input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    input = input.toString();
    return this.fetch(new Request(/^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`, requestInit), Env, executionCtx);
  }, "request");
  /**
  * `.fire()` automatically adds a global fetch event listener.
  * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
  * @deprecated
  * Use `fire` from `hono/service-worker` instead.
  * ```ts
  * import { Hono } from 'hono'
  * import { fire } from 'hono/service-worker'
  *
  * const app = new Hono()
  * // ...
  * fire(app)
  * ```
  * @see https://hono.dev/docs/api/hono#fire
  * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
  * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
  */
  fire = /* @__PURE__ */ __name(() => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  }, "fire");
};

// ../node_modules/hono/dist/router/utils.js
var createNullObject = /* @__PURE__ */ __name(() => /* @__PURE__ */ Object.create(null), "createNullObject");

// ../node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = /* @__PURE__ */ __name(((method2, path2) => {
    const matcher = matchers[method2] || matchers["ALL"];
    const staticMatch = matcher[2][path2];
    if (staticMatch) return staticMatch;
    const match3 = path2.match(matcher[0]);
    if (!match3) return [[], emptyParam];
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  }), "match");
  this.match = match2;
  return match2(method, path);
}
__name(match, "match");

// ../node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = /* @__PURE__ */ new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) return b.length === 1 ? a < b ? -1 : 1 : -1;
  if (b.length === 1) return 1;
  if (a === ".*" || a === "(?:|/.*)") return b === "(?:|/.*)" ? -1 : 1;
  else if (b === ".*" || b === "(?:|/.*)") return -1;
  if (a === "[^/]+") return 1;
  else if (b === "[^/]+") return -1;
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
__name(compareKey, "compareKey");
var Node = class Node2 {
  static {
    __name(this, "Node");
  }
  #index;
  #varIndex;
  #children = createNullObject();
  insert(tokens, index, paramMap, context2, isStatic) {
    let node = this;
    for (let i = 0, len = tokens.length; i < len; i++) {
      const token = tokens[i];
      const pattern = token.length === 1 ? token === "*" ? i === len - 1 ? [
        "",
        "",
        ".*"
      ] : [
        "",
        "",
        LABEL_REG_EXP_STR
      ] : null : token === "/*" ? [
        "",
        "",
        TAIL_WILDCARD_REG_EXP_STR
      ] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
      let nextNode;
      if (pattern) {
        const name = pattern[1];
        let regexpStr = pattern[2] || "[^/]+";
        if (name && pattern[2]) {
          if (regexpStr === ".*") throw PATH_ERROR;
          regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
          if (/\((?!\?:)/.test(regexpStr)) throw PATH_ERROR;
          if (regexpStr.length === 1 && regExpMetaChars.has(regexpStr)) throw PATH_ERROR;
        }
        nextNode = node.#children[regexpStr];
        if (!nextNode) {
          if (regexpStr !== ".*" && regexpStr !== "(?:|/.*)") {
            for (const k in node.#children) if ((regexpStr.length > 1 || k.length > 1) && k !== ".*" && k !== "(?:|/.*)") throw PATH_ERROR;
          }
          nextNode = node.#children[regexpStr] = new Node2();
        }
        if (name !== "") {
          nextNode.#varIndex ??= context2.varIndex++;
          paramMap.push([name, nextNode.#varIndex]);
        }
      } else {
        nextNode = node.#children[token];
        if (!nextNode) {
          for (const k in node.#children) if (k.length > 1 && k !== ".*" && k !== "(?:|/.*)") throw PATH_ERROR;
          nextNode = node.#children[token] = new Node2();
        }
      }
      node = nextNode;
    }
    if (node.#index !== void 0) throw PATH_ERROR;
    node.#index = isStatic ? -1 : index;
  }
  buildRegExpStr() {
    const strList = Object.keys(this.#children).sort(compareKey).map((k) => {
      const c = this.#children[k];
      const childStr = c.buildRegExpStr();
      return childStr === "" ? "" : (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + childStr;
    }).filter(Boolean);
    if (typeof this.#index === "number" && this.#index !== -1) strList.unshift(`#${this.#index}`);
    if (strList.length === 0) return "";
    if (strList.length === 1) return strList[0];
    return "(?:" + strList.join("|") + ")";
  }
};

// ../node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  static {
    __name(this, "Trie");
  }
  #context = { varIndex: 0 };
  #root = new Node();
  #index = 0;
  paths = createNullObject();
  insert(path, isStatic) {
    if (isStatic) {
      this.#root.insert(path.split(""), 0, [], this.#context, true);
      return;
    }
    const paramAssoc = [];
    const groups = [];
    let markedPath = path;
    for (let i = 0; ; ) {
      let replaced = false;
      markedPath = markedPath.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) break;
    }
    const tokens = markedPath.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) if (tokens[j].indexOf(mark) !== -1) {
        tokens[j] = tokens[j].replace(mark, groups[i][1]);
        break;
      }
    }
    this.#root.insert(tokens, this.#index, paramAssoc, this.#context, false);
    this.paths[path] = [this.#index++, paramAssoc];
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") return [
      /^$/,
      [],
      []
    ];
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [
      new RegExp(`^${regexp}`),
      indexReplacementMap,
      paramReplacementMap
    ];
  }
};

// ../node_modules/hono/dist/router/reg-exp-router/router.js
var wildcardRegExpCache = createNullObject();
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(`^${path.replace(/\/:[^/{}]+(?:\{\[\^\/]\+})?(?=[/{]|$)|\/?\*$|([.\\+*[^\]$()?{}|])/g, (match2, metaChar) => metaChar ? `\\${metaChar}` : match2 === "/*" ? TAIL_WILDCARD_REG_EXP_STR : match2 === "*" ? ".*" : `/:${LABEL_REG_EXP_STR}`)}$`);
}
__name(buildWildcardRegExp, "buildWildcardRegExp");
function findMiddleware(middleware, path) {
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) if (buildWildcardRegExp(k).test(path)) return [...middleware[k]];
}
__name(findMiddleware, "findMiddleware");
var RegExpRouter = class {
  static {
    __name(this, "RegExpRouter");
  }
  name = "RegExpRouter";
  #middleware;
  #routes;
  #tries;
  constructor() {
    this.#middleware = { ["ALL"]: createNullObject() };
    this.#routes = { ["ALL"]: createNullObject() };
    this.#tries = { ["ALL"]: new Trie() };
  }
  #insertPath(method, path) {
    try {
      this.#tries[method].insert(path, !/\*|\/:/.test(path));
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes2 = this.#routes;
    if (!middleware) throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    if (!middleware[method]) {
      this.#tries[method] = new Trie();
      for (const handlerMap of [middleware, routes2]) {
        handlerMap[method] = createNullObject();
        for (const p in handlerMap["ALL"]) {
          handlerMap[method][p] = [...handlerMap["ALL"][p]];
          this.#insertPath(method, p);
        }
      }
    }
    if (path === "/*") path = "*";
    const methods = method === "ALL" ? Object.keys(middleware) : [method];
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      for (const m of methods) if (!middleware[m][path]) {
        this.#insertPath(m, path);
        middleware[m][path] = findMiddleware(middleware[m], path) || findMiddleware(middleware["ALL"], path) || [];
      }
      for (const handlerMap of [middleware, routes2]) for (const m of methods) for (const p in handlerMap[m]) re.test(p) && handlerMap[m][p].push([handler, path]);
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (const path2 of paths) for (const m of methods) {
      if (!routes2[m][path2]) {
        this.#insertPath(m, path2);
        routes2[m][path2] = findMiddleware(middleware[m], path2) || findMiddleware(middleware["ALL"], path2) || [];
      }
      routes2[m][path2].push([handler, path2]);
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = createNullObject();
    for (const method of Object.keys(this.#routes)) matchers[method] = this.#buildMatcher(method);
    this.#middleware = this.#routes = this.#tries = void 0;
    wildcardRegExpCache = createNullObject();
    return matchers;
  }
  #buildMatcher(method) {
    const middleware = this.#middleware[method];
    const routes2 = this.#routes[method];
    const trie = this.#tries[method];
    const staticMap = createNullObject();
    const handlerData = [];
    const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
    for (const r of [middleware, routes2]) for (const path in r) {
      const handlers = r[path];
      const pathData = trie.paths[path];
      if (!pathData) {
        staticMap[path] = [handlers.map(([h]) => [h, createNullObject()]), emptyParam];
        continue;
      }
      handlerData[pathData[0]] = handlers.map(([h, handlerPath]) => [h, trie.paths[handlerPath][1].reduceRight((map, [key], i) => {
        map[key] = paramReplacementMap[pathData[1][i][1]];
        return map;
      }, createNullObject())]);
    }
    return [
      regexp,
      indexReplacementMap.map((i) => handlerData[i]),
      staticMap
    ];
  }
};

// ../node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  static {
    __name(this, "SmartRouter");
  }
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    this.#routes.push([
      method,
      path,
      handler
    ]);
  }
  match(method, path) {
    if (!this.#routes) throw new Error("Fatal error");
    const routers = this.#routers;
    const routes2 = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes2.length; i2 < len2; i2++) router.add(...routes2[i2]);
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) continue;
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) throw new Error("Fatal error");
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) throw new Error("No active router has been determined yet.");
    return this.#routers[0];
  }
};

// ../node_modules/hono/dist/router/trie-router/node.js
var emptyParams = createNullObject();
var order = 0;
var Node3 = class Node4 {
  static {
    __name(this, "Node");
  }
  #methods = [];
  #children = createNullObject();
  #patterns = [];
  #pattern;
  #params = emptyParams;
  insert(method, path, handler) {
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = /* @__PURE__ */ new Set();
    let i = 0;
    for (const p of parts) {
      const nextP = parts[++i];
      const pattern = getPattern(p, nextP) || (nextP === void 0 && p && p.indexOf("*") === p.length - 1 ? p : null);
      const isParam = Array.isArray(pattern);
      const key = isParam ? pattern[0] : pattern || p;
      const child = curNode.#children[key] ||= new Node4();
      if (pattern && !child.#pattern) {
        child.#pattern = pattern;
        curNode.#patterns.push(child);
      }
      curNode = child;
      if (isParam) possibleKeys.add(pattern[1]);
    }
    curNode.#methods.push({ [method]: {
      handler,
      possibleKeys: [...possibleKeys],
      score: ++order
    } });
  }
  #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m["ALL"];
      if (handlerSet) {
        handlerSet.params = createNullObject();
        handlerSets.push(handlerSet);
        for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
          const key = handlerSet.possibleKeys[i2];
          handlerSet.params[key] = params?.[key] && !i2 ? params[key] : nodeParams[key] ?? params?.[key];
        }
      }
    }
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    let curNodes = [this];
    const parts = splitPath(path);
    const curNodesQueue = [];
    const len = parts.length;
    let partOffsets = null;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
          } else tempNodes.push(nextNode);
        }
        for (const child of node.#patterns) {
          const pattern = child.#pattern;
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (typeof pattern === "string") {
            if (pattern === "*" || part.startsWith(pattern.slice(0, -1))) {
              this.#pushHandlerSets(handlerSets, child, method, node.#params);
              if (pattern === "*") {
                child.#params = params;
                tempNodes.push(child);
              }
            }
            continue;
          }
          const [, name, matcher] = pattern;
          if (!part && matcher === true) continue;
          if (matcher !== true) {
            if (!partOffsets) {
              partOffsets = [];
              let offset = path[0] === "/" ? 1 : 0;
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset;
                offset += parts[p].length + 1;
              }
            }
            const restPathString = path.slice(partOffsets[i]);
            const m = matcher.exec(restPathString);
            if (m) {
              if (!Object.hasOwn(params, name)) params[name] = m[0];
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
              if (m[0].length === restPathString.length && child.#children["*"]) this.#pushHandlerSets(handlerSets, child.#children["*"], method, node.#params, params);
              for (const _ in child.#children) {
                child.#params = params;
                const componentCount = m[0].match(/\//g)?.length ?? 0;
                (curNodesQueue[componentCount] ||= []).push(child);
                break;
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            if (!Object.hasOwn(params, name)) params[name] = part;
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
              if (child.#children["*"]) this.#pushHandlerSets(handlerSets, child.#children["*"], method, params, node.#params);
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      const shifted = curNodesQueue.shift();
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
    }
    if (handlerSets[1]) handlerSets.sort((a, b) => {
      return a.score - b.score;
    });
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// ../node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  static {
    __name(this, "TrieRouter");
  }
  name = "TrieRouter";
  #node = new Node3();
  add(method, path, handler) {
    for (const result of checkOptionalParameter(path) || [path]) this.#node.insert(method, result, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// ../node_modules/hono/dist/hono.js
var Hono3 = class extends Hono {
  static {
    __name(this, "Hono");
  }
  /**
  * Creates an instance of the Hono class.
  *
  * @param options - Optional configuration options for the Hono instance.
  */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({ routers: [new RegExpRouter(), new TrieRouter()] });
  }
};

// ../node_modules/hono/dist/middleware/cors/index.js
var cors = /* @__PURE__ */ __name((options) => {
  const opts = {
    origin: "*",
    allowMethods: [
      "GET",
      "HEAD",
      "PUT",
      "POST",
      "DELETE",
      "PATCH",
      "QUERY"
    ],
    allowHeaders: [],
    exposeHeaders: [],
    ...options
  };
  const exposeHeadersStr = opts.exposeHeaders?.length ? opts.exposeHeaders.join(",") : void 0;
  const allowHeadersStr = opts.allowHeaders?.length ? opts.allowHeaders.join(",") : void 0;
  const findAllowOrigin = ((optsOrigin) => {
    if (typeof optsOrigin === "string") {
      if (optsOrigin === "*") return () => optsOrigin;
      else return (origin) => optsOrigin === origin ? origin : null;
    } else if (typeof optsOrigin === "function") return optsOrigin;
    else return (origin) => optsOrigin.includes(origin) ? origin : null;
  })(opts.origin);
  const findAllowMethods = ((optsAllowMethods) => {
    if (typeof optsAllowMethods === "function") return async (origin, c) => (await optsAllowMethods(origin, c)).join(",");
    else if (Array.isArray(optsAllowMethods)) {
      const methodsStr = optsAllowMethods.join(",");
      return () => methodsStr;
    } else return () => "";
  })(opts.allowMethods);
  return /* @__PURE__ */ __name(async function cors2(c, next) {
    function set(key, value) {
      c.res.headers.set(key, value);
    }
    __name(set, "set");
    const allowOrigin = await findAllowOrigin(c.req.header("origin") || "", c);
    if (allowOrigin) set("Access-Control-Allow-Origin", allowOrigin);
    if (opts.credentials) set("Access-Control-Allow-Credentials", "true");
    if (exposeHeadersStr) set("Access-Control-Expose-Headers", exposeHeadersStr);
    if (c.req.method === "OPTIONS") {
      if (opts.origin !== "*") c.res.headers.append("Vary", "Origin");
      if (opts.maxAge != null) set("Access-Control-Max-Age", opts.maxAge.toString());
      const allowMethods = await findAllowMethods(c.req.header("origin") || "", c);
      if (allowMethods) set("Access-Control-Allow-Methods", allowMethods);
      let headersStr = allowHeadersStr;
      if (!headersStr) {
        const requestHeaders = c.req.header("Access-Control-Request-Headers");
        if (requestHeaders) headersStr = requestHeaders.split(",").map((h) => h.trim()).join(",");
      }
      if (headersStr) {
        set("Access-Control-Allow-Headers", headersStr);
        c.res.headers.append("Vary", "Access-Control-Request-Headers");
      }
      c.res.headers.delete("Content-Length");
      c.res.headers.delete("Content-Type");
      return new Response(null, {
        headers: c.res.headers,
        status: 204,
        statusText: "No Content"
      });
    }
    await next();
    if (opts.origin !== "*") c.header("Vary", "Origin", { append: true });
  }, "cors");
}, "cors");

// ../node_modules/hono/dist/utils/color.js
function getColorEnabled() {
  const { process, Deno } = globalThis;
  return !(typeof Deno?.noColor === "boolean" ? Deno.noColor : process !== void 0 ? "NO_COLOR" in process?.env : false);
}
__name(getColorEnabled, "getColorEnabled");
async function getColorEnabledAsync() {
  const { navigator } = globalThis;
  const cfWorkers = "cloudflare:workers";
  return !(navigator !== void 0 && navigator.userAgent === "Cloudflare-Workers" ? await (async () => {
    try {
      return "NO_COLOR" in ((await import(cfWorkers)).env ?? {});
    } catch {
      return false;
    }
  })() : !getColorEnabled());
}
__name(getColorEnabledAsync, "getColorEnabledAsync");

// ../node_modules/hono/dist/middleware/logger/index.js
var humanize = /* @__PURE__ */ __name((times) => {
  const [delimiter, separator] = [",", "."];
  return times.map((v) => v.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1" + delimiter)).join(separator);
}, "humanize");
var time3 = /* @__PURE__ */ __name((start) => {
  const delta = Date.now() - start;
  return humanize([delta < 1e3 ? delta + "ms" : Math.round(delta / 1e3) + "s"]);
}, "time");
var colorStatus = /* @__PURE__ */ __name(async (status) => {
  if (await getColorEnabledAsync()) switch (status / 100 | 0) {
    case 5:
      return `\x1B[31m${status}\x1B[0m`;
    case 4:
      return `\x1B[33m${status}\x1B[0m`;
    case 3:
      return `\x1B[36m${status}\x1B[0m`;
    case 2:
      return `\x1B[32m${status}\x1B[0m`;
  }
  return `${status}`;
}, "colorStatus");
async function log3(fn, prefix, method, path, status = 0, elapsed) {
  fn(prefix === "<--" ? `${prefix} ${method} ${path}` : `${prefix} ${method} ${path} ${await colorStatus(status)} ${elapsed}`);
}
__name(log3, "log");
var logger = /* @__PURE__ */ __name((fn = console.log) => {
  return /* @__PURE__ */ __name(async function logger2(c, next) {
    const { method, url } = c.req;
    const path = url.slice(url.indexOf("/", 8));
    await log3(fn, "<--", method, path);
    const start = Date.now();
    await next();
    await log3(fn, "-->", method, path, c.res.status, time3(start));
  }, "logger");
}, "logger");

// src/lib/db.ts
async function firstId(db, sql, ...values) {
  const row = await db.prepare(sql).bind(...values).first();
  return row?.id ?? null;
}
__name(firstId, "firstId");
async function resolveDepartmentId(db, value) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return await firstId(db, "SELECT id FROM departments WHERE id = ? LIMIT 1", trimmed) ?? await firstId(db, "SELECT id FROM departments WHERE nama = ? COLLATE NOCASE LIMIT 1", trimmed) ?? await firstId(
    db,
    "SELECT id FROM departments WHERE nama LIKE ? COLLATE NOCASE LIMIT 1",
    `%${trimmed}%`
  );
}
__name(resolveDepartmentId, "resolveDepartmentId");
async function resolveStatusId(db, value, fallback = "BELUM_MULA") {
  const trimmed = value?.trim();
  if (trimmed) {
    const found = await firstId(db, "SELECT id FROM inspection_statuses WHERE id = ? LIMIT 1", trimmed) ?? await firstId(
      db,
      "SELECT id FROM inspection_statuses WHERE nama = ? COLLATE NOCASE LIMIT 1",
      trimmed
    );
    if (found) return found;
  }
  return fallback;
}
__name(resolveStatusId, "resolveStatusId");
async function resolveRoomCategoryId(db, value, fallback = "MAKMAL_KOMPUTER") {
  const trimmed = value?.trim();
  if (trimmed) {
    const found = await firstId(db, "SELECT id FROM room_categories WHERE id = ? LIMIT 1", trimmed) ?? await firstId(
      db,
      "SELECT id FROM room_categories WHERE nama = ? COLLATE NOCASE LIMIT 1",
      trimmed
    );
    if (found) return found;
  }
  return fallback;
}
__name(resolveRoomCategoryId, "resolveRoomCategoryId");
async function resolveAssetCategoryId(db, value, fallback = "SEMUA") {
  const trimmed = value?.trim();
  if (trimmed) {
    const found = await firstId(db, "SELECT id FROM asset_categories WHERE id = ? LIMIT 1", trimmed) ?? await firstId(
      db,
      "SELECT id FROM asset_categories WHERE nama = ? COLLATE NOCASE LIMIT 1",
      trimmed
    );
    if (found) return found;
  }
  return fallback;
}
__name(resolveAssetCategoryId, "resolveAssetCategoryId");
async function ensureBuildingId(db, value, latitude, longitude) {
  const trimmed = value?.trim();
  if (trimmed) {
    const found = await firstId(db, "SELECT id FROM buildings WHERE id = ? LIMIT 1", trimmed) ?? await firstId(db, "SELECT id FROM buildings WHERE kod = ? COLLATE NOCASE LIMIT 1", trimmed) ?? await firstId(
      db,
      "SELECT id FROM buildings WHERE nama = ? COLLATE NOCASE LIMIT 1",
      trimmed
    );
    if (found) return found;
  }
  const id = `BGN-${Date.now().toString(36).toUpperCase()}`;
  await db.prepare(
    `INSERT INTO buildings (id, kod, nama, kampus_zon, default_latitude, default_longitude)
       VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(id, id, trimmed || "Bangunan Tidak Dinyatakan", "Zon Lain", latitude, longitude).run();
  return id;
}
__name(ensureBuildingId, "ensureBuildingId");
async function ensureOfficerId(db, input, departmentId) {
  const id = input.id?.trim();
  const emel = input.emel?.trim();
  const nama = input.nama?.trim();
  if (id) {
    const found = await firstId(db, "SELECT id FROM officers WHERE id = ? LIMIT 1", id);
    if (found) return found;
  }
  if (emel) {
    const found = await firstId(
      db,
      "SELECT id FROM officers WHERE emel = ? COLLATE NOCASE LIMIT 1",
      emel
    );
    if (found) return found;
  }
  if (nama) {
    const found = await firstId(
      db,
      "SELECT id FROM officers WHERE nama = ? COLLATE NOCASE LIMIT 1",
      nama
    );
    if (found) return found;
  }
  if (!emel && !nama) return null;
  const newId = `PEG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
  await db.prepare(
    `INSERT INTO officers (id, nama, emel, jawatan, gred, telefon, department_id, peranan)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    newId,
    nama || emel,
    emel || `${newId.toLowerCase()}@poliku.edu.my`,
    input.jawatan?.trim() || "Pegawai Pemeriksa",
    input.gred?.trim() || "DH41",
    input.tel?.trim() || null,
    departmentId,
    "Pegawai Pemeriksa"
  ).run();
  return newId;
}
__name(ensureOfficerId, "ensureOfficerId");
async function ensureSessionId(db, tarikhMula) {
  const year = Number(String(tarikhMula ?? "").slice(0, 4)) || (/* @__PURE__ */ new Date()).getFullYear();
  const existing = await firstId(
    db,
    "SELECT id FROM inspection_sessions WHERE tahun = ? LIMIT 1",
    year
  );
  if (existing) return existing;
  const id = `SESI-${year}`;
  await db.prepare(
    `INSERT INTO inspection_sessions (id, tahun, tarikh_mula, tarikh_tamat, tarikh_pra_jkpak)
       VALUES (?, ?, ?, ?, ?)`
  ).bind(id, year, `${year}-01-01`, `${year}-12-31`, `${year}-10-15`).run();
  return id;
}
__name(ensureSessionId, "ensureSessionId");

// src/routes/locations.ts
var DEFAULT_LATITUDE = 1.621425;
var DEFAULT_LONGITUDE = 110.32358;
var CUSTODIAN_SELECT = `
  SELECT lc.location_id, o.id, o.nama, o.jawatan, o.emel, o.telefon AS tel
  FROM location_custodians lc
  JOIN officers o ON o.id = lc.officer_id
`;
function mapOfficer(row) {
  return {
    id: row.id,
    nama: row.nama,
    jawatan: row.jawatan ?? void 0,
    emel: row.emel ?? void 0,
    tel: row.tel ?? void 0
  };
}
__name(mapOfficer, "mapOfficer");
function mapLocation(row, officers) {
  return {
    id: row.id,
    kodRuang: row.kodRuang,
    nama: row.nama,
    jabatan: row.jabatan,
    kategoriRuang: row.kategoriRuang,
    bangunan: row.bangunan,
    aras: row.aras,
    penjaga: row.penjaga,
    penjagaJawatan: row.penjagaJawatan ?? void 0,
    penjagaEmel: row.penjagaEmel ?? void 0,
    penjagaTel: row.penjagaTel ?? void 0,
    anggaranAset: Number(row.anggaranAset) || 0,
    statusPemeriksaan: row.statusPemeriksaan,
    tarikhTerakhirDiperiksa: row.tarikhTerakhirDiperiksa ?? void 0,
    jadualId: row.jadualId ?? void 0,
    kewpa7TerkiniId: row.kewpa7TerkiniId ?? void 0,
    tarikhKemaskiniKewpa7: row.tarikhKemaskiniKewpa7 ?? void 0,
    latitude: Number(row.latitude) || DEFAULT_LATITUDE,
    longitude: Number(row.longitude) || DEFAULT_LONGITUDE,
    pegawaiBertanggungjawabList: officers
  };
}
__name(mapLocation, "mapLocation");
function custodianInputs(body) {
  if (Array.isArray(body.pegawaiBertanggungjawabList) && body.pegawaiBertanggungjawabList.length > 0) {
    return body.pegawaiBertanggungjawabList;
  }
  if (body.penjaga) {
    return [
      {
        nama: body.penjaga,
        jawatan: body.penjagaJawatan,
        emel: body.penjagaEmel,
        tel: body.penjagaTel
      }
    ];
  }
  return [];
}
__name(custodianInputs, "custodianInputs");
async function syncCustodians(db, locationId, departmentId, inputs) {
  await db.prepare("DELETE FROM location_custodians WHERE location_id = ?").bind(locationId).run();
  let index = 0;
  for (const input of inputs) {
    const officerId = await ensureOfficerId(db, input, departmentId);
    if (!officerId) continue;
    index += 1;
    await db.prepare(
      `INSERT OR IGNORE INTO location_custodians (id, location_id, officer_id, jenis_penjaga)
         VALUES (?, ?, ?, ?)`
    ).bind(
      `LC-${locationId}-${index}`,
      locationId,
      officerId,
      index === 1 ? "Pegawai Bertanggungjawab Utama" : "Pembantu"
    ).run();
  }
}
__name(syncCustodians, "syncCustodians");
var locationsRoute = new Hono3().get("/", async (c) => {
  const dept = c.req.query("dept");
  const status = c.req.query("status");
  const search = c.req.query("q");
  try {
    const clauses = [];
    const params = [];
    if (dept && dept !== "SEMUA") {
      clauses.push("jabatan = ?");
      params.push(dept);
    }
    if (status && status !== "SEMUA") {
      clauses.push("statusPemeriksaan = ?");
      params.push(status);
    }
    if (search) {
      clauses.push("(kodRuang LIKE ? OR nama LIKE ? OR bangunan LIKE ? OR penjaga LIKE ?)");
      const wildcard = `%${search}%`;
      params.push(wildcard, wildcard, wildcard, wildcard);
    }
    const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    const { results } = await c.env.DB.prepare(
      `SELECT * FROM v_locations_full ${where} ORDER BY kodRuang ASC`
    ).bind(...params).all();
    const { results: custodianRows } = await c.env.DB.prepare(CUSTODIAN_SELECT).all();
    const officersByLocation = /* @__PURE__ */ new Map();
    for (const row of custodianRows ?? []) {
      const list = officersByLocation.get(row.location_id) ?? [];
      list.push(mapOfficer(row));
      officersByLocation.set(row.location_id, list);
    }
    const locations = (results ?? []).map(
      (row) => mapLocation(row, officersByLocation.get(row.id) ?? [])
    );
    return c.json({
      success: true,
      total: locations.length,
      data: locations
    });
  } catch (e) {
    return c.json({ success: false, message: "Ralat mendapatkan senarai lokasi: " + e.message }, 500);
  }
}).get("/:id", async (c) => {
  const id = c.req.param("id");
  try {
    const row = await c.env.DB.prepare(
      "SELECT * FROM v_locations_full WHERE id = ? OR kodRuang = ? LIMIT 1"
    ).bind(id, id).first();
    if (!row) {
      return c.json({ success: false, message: "Lokasi tidak dijumpai" }, 404);
    }
    const { results: custodianRows } = await c.env.DB.prepare(
      `${CUSTODIAN_SELECT} WHERE lc.location_id = ?`
    ).bind(row.id).all();
    return c.json({
      success: true,
      data: mapLocation(row, (custodianRows ?? []).map(mapOfficer))
    });
  } catch (e) {
    return c.json({ success: false, message: e.message }, 500);
  }
}).post("/", async (c) => {
  try {
    const body = await c.req.json();
    const inputs = custodianInputs(body);
    if (!body.kodRuang || !body.nama || !body.jabatan || inputs.length === 0) {
      return c.json(
        { success: false, message: "Kod Ruang, Nama, Jabatan dan Penjaga wajib diisi" },
        400
      );
    }
    const departmentId = await resolveDepartmentId(c.env.DB, body.jabatan);
    if (!departmentId) {
      return c.json({ success: false, message: `Jabatan '${body.jabatan}' tidak dijumpai` }, 400);
    }
    const latitude = typeof body.latitude === "number" ? body.latitude : DEFAULT_LATITUDE;
    const longitude = typeof body.longitude === "number" ? body.longitude : DEFAULT_LONGITUDE;
    const id = body.id || `LOK-${Date.now().toString(36).toUpperCase()}`;
    const buildingId = await ensureBuildingId(c.env.DB, body.bangunan, latitude, longitude);
    const categoryId = await resolveRoomCategoryId(c.env.DB, body.kategoriRuang);
    const statusId = await resolveStatusId(c.env.DB, body.statusPemeriksaan);
    await c.env.DB.prepare(
      `INSERT INTO locations (
          id, kod_ruang, nama, department_id, building_id, aras, category_id,
          status_id, tarikh_terakhir_diperiksa, latitude, longitude
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      body.kodRuang,
      body.nama,
      departmentId,
      buildingId,
      body.aras || "Aras 1",
      categoryId,
      statusId,
      body.tarikhTerakhirDiperiksa || null,
      latitude,
      longitude
    ).run();
    await syncCustodians(c.env.DB, id, departmentId, inputs);
    const row = await c.env.DB.prepare("SELECT * FROM v_locations_full WHERE id = ?").bind(id).first();
    const { results: custodianRows } = await c.env.DB.prepare(
      `${CUSTODIAN_SELECT} WHERE lc.location_id = ?`
    ).bind(id).all();
    return c.json(
      {
        success: true,
        message: "Lokasi berjaya didaftarkan ke Cloudflare D1",
        data: row ? mapLocation(row, (custodianRows ?? []).map(mapOfficer)) : { id }
      },
      201
    );
  } catch (e) {
    const duplicate = /UNIQUE/i.test(e.message);
    return c.json(
      {
        success: false,
        message: duplicate ? "Kod ruang telah wujud" : "Gagal mendaftar lokasi: " + e.message
      },
      duplicate ? 409 : 500
    );
  }
}).put("/:id", async (c) => {
  const id = c.req.param("id");
  try {
    const body = await c.req.json();
    const current = await c.env.DB.prepare("SELECT * FROM locations WHERE id = ?").bind(id).first();
    if (!current) {
      return c.json({ success: false, message: "Lokasi tidak dijumpai" }, 404);
    }
    const latitude = typeof body.latitude === "number" ? body.latitude : Number(current.latitude) || DEFAULT_LATITUDE;
    const longitude = typeof body.longitude === "number" ? body.longitude : Number(current.longitude) || DEFAULT_LONGITUDE;
    const assignments = [];
    const params = [];
    const set = /* @__PURE__ */ __name((column, value) => {
      assignments.push(`${column} = ?`);
      params.push(value);
    }, "set");
    if (body.kodRuang !== void 0) set("kod_ruang", body.kodRuang);
    if (body.nama !== void 0) set("nama", body.nama);
    if (body.aras !== void 0) set("aras", body.aras);
    if (body.tarikhTerakhirDiperiksa !== void 0) {
      set("tarikh_terakhir_diperiksa", body.tarikhTerakhirDiperiksa || null);
    }
    if (body.latitude !== void 0 || body.longitude !== void 0) {
      set("latitude", latitude);
      set("longitude", longitude);
    }
    let departmentId = current.department_id;
    if (body.jabatan !== void 0) {
      const resolved = await resolveDepartmentId(c.env.DB, body.jabatan);
      if (!resolved) {
        return c.json({ success: false, message: `Jabatan '${body.jabatan}' tidak dijumpai` }, 400);
      }
      departmentId = resolved;
      set("department_id", resolved);
    }
    if (body.bangunan !== void 0) {
      set("building_id", await ensureBuildingId(c.env.DB, body.bangunan, latitude, longitude));
    }
    if (body.kategoriRuang !== void 0) {
      set("category_id", await resolveRoomCategoryId(c.env.DB, body.kategoriRuang));
    }
    if (body.statusPemeriksaan !== void 0) {
      set("status_id", await resolveStatusId(c.env.DB, body.statusPemeriksaan));
    }
    if (assignments.length > 0) {
      await c.env.DB.prepare(
        `UPDATE locations SET ${assignments.join(", ")}, updated_at = datetime('now') WHERE id = ?`
      ).bind(...params, id).run();
    }
    if (body.pegawaiBertanggungjawabList !== void 0 || body.penjaga !== void 0) {
      await syncCustodians(c.env.DB, id, departmentId, custodianInputs(body));
    }
    const row = await c.env.DB.prepare("SELECT * FROM v_locations_full WHERE id = ?").bind(id).first();
    const { results: custodianRows } = await c.env.DB.prepare(
      `${CUSTODIAN_SELECT} WHERE lc.location_id = ?`
    ).bind(id).all();
    return c.json({
      success: true,
      message: "Maklumat lokasi berjaya dikemaskini di Cloudflare D1",
      data: row ? mapLocation(row, (custodianRows ?? []).map(mapOfficer)) : void 0
    });
  } catch (e) {
    const duplicate = /UNIQUE/i.test(e.message);
    return c.json(
      {
        success: false,
        message: duplicate ? "Kod ruang telah wujud" : e.message
      },
      duplicate ? 409 : 500
    );
  }
}).delete("/:id", async (c) => {
  const id = c.req.param("id");
  try {
    const existing = await c.env.DB.prepare("SELECT id FROM locations WHERE id = ?").bind(id).first();
    if (!existing) {
      return c.json({ success: false, message: "Lokasi tidak dijumpai" }, 404);
    }
    await c.env.DB.prepare("DELETE FROM location_custodians WHERE location_id = ?").bind(id).run();
    await c.env.DB.prepare("DELETE FROM locations WHERE id = ?").bind(id).run();
    return c.json({
      success: true,
      message: `Lokasi ${id} berjaya dipadam dari Cloudflare D1`
    });
  } catch (e) {
    const referenced = /FOREIGN KEY/i.test(e.message);
    return c.json(
      {
        success: false,
        message: referenced ? "Lokasi tidak boleh dipadam kerana masih dirujuk oleh aset atau jadual pemeriksaan" : e.message
      },
      referenced ? 409 : 500
    );
  }
});

// src/lib/auth.ts
var DEFAULT_ITERATIONS = 25e3;
var MIN_ITERATIONS = 1e4;
var KEY_LENGTH_BITS = 256;
var SALT_BYTES = 16;
var TOKEN_HEADER = { alg: "HS256", typ: "JWT" };
var TOKEN_TTL_SECONDS = 8 * 60 * 60;
var MIN_PASSWORD_LENGTH = 8;
function resolveIterations(env2) {
  const raw2 = Number(env2.AUTH_ITERATIONS);
  return Number.isFinite(raw2) && raw2 >= MIN_ITERATIONS ? Math.floor(raw2) : DEFAULT_ITERATIONS;
}
__name(resolveIterations, "resolveIterations");
function getSecret(env2) {
  const secret = (env2.JWT_SECRET ?? "").trim();
  return secret.length >= 16 ? secret : null;
}
__name(getSecret, "getSecret");
function toHex(bytes) {
  return Array.from(new Uint8Array(bytes)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
__name(toHex, "toHex");
function fromHex(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
__name(fromHex, "fromHex");
function base64UrlEncodeBytes(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
__name(base64UrlEncodeBytes, "base64UrlEncodeBytes");
function base64UrlEncodeText(value) {
  return base64UrlEncodeBytes(new TextEncoder().encode(value));
}
__name(base64UrlEncodeText, "base64UrlEncodeText");
function base64UrlDecode(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    Math.ceil(value.length / 4) * 4,
    "="
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
__name(base64UrlDecode, "base64UrlDecode");
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
__name(timingSafeEqual, "timingSafeEqual");
function createSalt() {
  const salt = new Uint8Array(SALT_BYTES);
  crypto.getRandomValues(salt);
  return toHex(salt.buffer);
}
__name(createSalt, "createSalt");
async function hashPassword(password, salt, iterations) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: fromHex(salt), iterations },
    key,
    KEY_LENGTH_BITS
  );
  return toHex(bits);
}
__name(hashPassword, "hashPassword");
async function verifyPassword(password, salt, iterations, expectedHash) {
  const hash = await hashPassword(password, salt, iterations);
  return timingSafeEqual(hash, expectedHash);
}
__name(verifyPassword, "verifyPassword");
async function hmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}
__name(hmacKey, "hmacKey");
async function signToken(subject, secret, ttlSeconds = TOKEN_TTL_SECONDS) {
  const issuedAt = Math.floor(Date.now() / 1e3);
  const payload = {
    sub: subject.id,
    emel: subject.emel,
    iat: issuedAt,
    exp: issuedAt + ttlSeconds
  };
  const header = base64UrlEncodeText(JSON.stringify(TOKEN_HEADER));
  const body = base64UrlEncodeText(JSON.stringify(payload));
  const signature = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(secret),
    new TextEncoder().encode(`${header}.${body}`)
  );
  return {
    token: `${header}.${body}.${base64UrlEncodeBytes(new Uint8Array(signature))}`,
    expiresAt: new Date(payload.exp * 1e3).toISOString()
  };
}
__name(signToken, "signToken");
async function verifyToken(token, secret) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(secret),
      base64UrlDecode(signature),
      new TextEncoder().encode(`${header}.${body}`)
    );
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(body)));
    if (!payload?.sub || !payload.exp) return null;
    if (payload.exp <= Math.floor(Date.now() / 1e3)) return null;
    return payload;
  } catch {
    return null;
  }
}
__name(verifyToken, "verifyToken");

// src/middleware/auth.ts
var OFFICER_QUERY = `
  SELECT id, nama, emel, peranan AS role, department_id AS dept
  FROM officers
  WHERE id = ?
  LIMIT 1
`;
var requireAuth = /* @__PURE__ */ __name(async (c, next) => {
  const secret = getSecret(c.env);
  if (!secret) {
    return c.json(
      {
        success: false,
        code: "AUTH_NOT_CONFIGURED",
        message: "Pengesahan belum dikonfigurasi pada Worker. Tetapkan JWT_SECRET melalui `wrangler secret put JWT_SECRET`."
      },
      503
    );
  }
  const header = c.req.header("authorization") ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) {
    return c.json(
      {
        success: false,
        code: "UNAUTHENTICATED",
        message: "Sesi tidak sah. Sila log masuk ke portal."
      },
      401
    );
  }
  const payload = await verifyToken(header.slice(7).trim(), secret);
  if (!payload) {
    return c.json(
      {
        success: false,
        code: "SESSION_EXPIRED",
        message: "Sesi telah tamat. Sila log masuk semula."
      },
      401
    );
  }
  const officer = await c.env.DB.prepare(OFFICER_QUERY).bind(payload.sub).first();
  if (!officer) {
    return c.json(
      {
        success: false,
        code: "UNAUTHENTICATED",
        message: "Akaun pegawai tidak dijumpai dalam direktori."
      },
      401
    );
  }
  c.set("auth", officer);
  await next();
}, "requireAuth");
function getAuthUser(c) {
  return c.get("auth") ?? null;
}
__name(getAuthUser, "getAuthUser");
var requireRole = /* @__PURE__ */ __name((roleId) => async (c, next) => {
  const auth = getAuthUser(c);
  if (!auth) {
    return c.json(
      { success: false, code: "UNAUTHENTICATED", message: "Sesi tidak sah. Sila log masuk ke portal." },
      401
    );
  }
  const row = await c.env.DB.prepare(
    `SELECT 1 AS ok FROM role_assignments
     WHERE officer_id = ? AND role_id = ? AND status = 'AKTIF'
       AND valid_from <= date('now') AND (valid_to IS NULL OR valid_to >= date('now'))
     LIMIT 1`
  ).bind(auth.id, roleId).first();
  if (!row) {
    return c.json(
      {
        success: false,
        code: "FORBIDDEN",
        message: `Akses ditolak: tindakan ini memerlukan peranan ${roleId}.`
      },
      403
    );
  }
  await next();
}, "requireRole");

// src/lib/roles.ts
var ROLE_DEFINITIONS = [
  { id: "PEMERIKSA", nama: "Pegawai Pemeriksa", scopeType: "GLOBAL", defaultTenureMonths: 24 },
  { id: "PENYELIA_LOKASI", nama: "Penyelia Lokasi", scopeType: "LOCATION", defaultTenureMonths: null },
  {
    id: "PENOLONG_PEGAWAI_ASET",
    nama: "Penolong Pegawai Aset",
    scopeType: "DEPARTMENT",
    defaultTenureMonths: null
  },
  { id: "KETUA_JABATAN", nama: "Ketua Jabatan", scopeType: "DEPARTMENT", defaultTenureMonths: null },
  { id: "KETUA_PROGRAM", nama: "Ketua Program", scopeType: "DEPARTMENT", defaultTenureMonths: null },
  { id: "PENTADBIR_SISTEM", nama: "Pentadbir Sistem", scopeType: "GLOBAL", defaultTenureMonths: null }
];
var LEGACY_ROLE_MAP = {
  pemeriksa: "PEMERIKSA",
  "pegawai pemeriksa": "PEMERIKSA",
  "penyelia lokasi": "PENYELIA_LOKASI",
  "penolong pegawai aset": "PENOLONG_PEGAWAI_ASET",
  "penolong pegawai aset jabatan/unit": "PENOLONG_PEGAWAI_ASET",
  "ketua jabatan": "KETUA_JABATAN",
  "ketua program": "KETUA_PROGRAM",
  "pentadbir sistem": "PENTADBIR_SISTEM"
};
function resolveRoleId(value) {
  const key = (value ?? "").trim().toLowerCase();
  if (!key) return null;
  const byId = ROLE_DEFINITIONS.find((role) => role.id.toLowerCase() === key);
  if (byId) return byId.id;
  return LEGACY_ROLE_MAP[key] ?? null;
}
__name(resolveRoleId, "resolveRoleId");
function roleDefinition(roleId) {
  return ROLE_DEFINITIONS.find((role) => role.id === roleId) ?? null;
}
__name(roleDefinition, "roleDefinition");
var todayIso = /* @__PURE__ */ __name(() => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10), "todayIso");
function addMonths(dateIso, months) {
  const date = /* @__PURE__ */ new Date(`${dateIso}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}
__name(addMonths, "addMonths");
function isActiveOn(assignment, date) {
  return assignment.status === "AKTIF" && assignment.validFrom <= date && (!assignment.validTo || assignment.validTo >= date);
}
__name(isActiveOn, "isActiveOn");
async function assignRole(db, input) {
  const definition = roleDefinition(input.roleId);
  if (!definition) {
    throw new Error(`Peranan '${input.roleId}' tidak sah`);
  }
  const scopeType = input.scopeType ?? definition.scopeType;
  const scopeId = scopeType === "GLOBAL" ? null : input.scopeId ?? null;
  if (scopeType !== "GLOBAL" && !scopeId) {
    throw new Error(`Skop ${scopeType} memerlukan scopeId`);
  }
  const validFrom = input.validFrom?.trim() || todayIso();
  const validTo = input.validTo?.trim() || (definition.defaultTenureMonths ? addMonths(validFrom, definition.defaultTenureMonths) : null);
  const existing = await db.prepare(
    `SELECT id FROM role_assignments
       WHERE officer_id = ? AND role_id = ? AND status = 'AKTIF'
         AND COALESCE(scope_id, '') = COALESCE(?, '')
       LIMIT 1`
  ).bind(input.officerId, definition.id, scopeId).first();
  if (existing) {
    return { id: existing.id, created: false, assignment: await getAssignment(db, existing.id) };
  }
  const id = `RA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  await db.prepare(
    `INSERT INTO role_assignments
         (id, officer_id, role_id, scope_type, scope_id, valid_from, valid_to, status, notes, created_by_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'AKTIF', ?, ?)`
  ).bind(
    id,
    input.officerId,
    definition.id,
    scopeType,
    scopeId,
    validFrom,
    validTo,
    input.notes ?? null,
    input.createdById ?? null
  ).run();
  return { id, created: true, assignment: await getAssignment(db, id) };
}
__name(assignRole, "assignRole");
var ASSIGNMENT_SELECT = `
  SELECT
    ra.id,
    ra.officer_id AS officerId,
    ra.role_id AS roleId,
    r.nama AS roleName,
    ra.scope_type AS scopeType,
    ra.scope_id AS scopeId,
    ra.valid_from AS validFrom,
    ra.valid_to AS validTo,
    ra.status,
    ra.notes,
    ra.created_at AS createdAt
  FROM role_assignments ra
  JOIN roles r ON r.id = ra.role_id
`;
async function getAssignment(db, id) {
  return db.prepare(`${ASSIGNMENT_SELECT} WHERE ra.id = ? LIMIT 1`).bind(id).first();
}
__name(getAssignment, "getAssignment");
async function listAssignmentsForOfficer(db, officerId) {
  const { results } = await db.prepare(`${ASSIGNMENT_SELECT} WHERE ra.officer_id = ? ORDER BY ra.valid_from DESC, ra.created_at DESC`).bind(officerId).all();
  return results ?? [];
}
__name(listAssignmentsForOfficer, "listAssignmentsForOfficer");
async function listAssignments(db, filters = {}) {
  const clauses = [];
  const params = [];
  if (filters.officerId) {
    clauses.push("ra.officer_id = ?");
    params.push(filters.officerId);
  }
  if (filters.roleId) {
    clauses.push("ra.role_id = ?");
    params.push(filters.roleId);
  }
  if (filters.status) {
    clauses.push("ra.status = ?");
    params.push(filters.status);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { results } = await db.prepare(`${ASSIGNMENT_SELECT} ${where} ORDER BY ra.valid_from DESC, ra.created_at DESC LIMIT 500`).bind(...params).all();
  return results ?? [];
}
__name(listAssignments, "listAssignments");
async function hasActiveRole(db, officerId, roleId, date = todayIso()) {
  const row = await db.prepare(
    `SELECT 1 AS ok FROM role_assignments
       WHERE officer_id = ? AND role_id = ? AND status = 'AKTIF'
         AND valid_from <= ? AND (valid_to IS NULL OR valid_to >= ?)
       LIMIT 1`
  ).bind(officerId, roleId, date, date).first();
  return Boolean(row);
}
__name(hasActiveRole, "hasActiveRole");
async function assignDefaultRoleForOfficer(db, params) {
  const roleId = resolveRoleId(params.roleValue);
  if (!roleId) return null;
  const definition = roleDefinition(roleId);
  if (!definition) return null;
  const scopeType = definition.scopeType === "LOCATION" ? "DEPARTMENT" : definition.scopeType;
  const scopeId = scopeType === "GLOBAL" ? null : params.departmentId;
  const result = await assignRole(db, {
    officerId: params.officerId,
    roleId,
    scopeType,
    scopeId,
    createdById: params.createdById ?? null,
    notes: definition.scopeType === "LOCATION" ? "Lantikan awal berperingkat jabatan (ruang belum ditetapkan)" : "Lantikan awal semasa pendaftaran pegawai"
  });
  return { id: result.id, created: result.created };
}
__name(assignDefaultRoleForOfficer, "assignDefaultRoleForOfficer");

// src/lib/policies.ts
function policyForCodes(codes) {
  if (codes.includes("NO_APPOINTMENT") || codes.includes("APPOINTMENT_EXPIRED") || codes.includes("PERIOD_NOT_COVERED")) {
    return "POL_INSPECTOR_APPOINTMENT_REQUIRED";
  }
  if (codes.includes("CROSS_DEPARTMENT_REQUIRED")) return "POL_CROSS_INSPECTION_MANDATE";
  if (codes.includes("CUSTODIAN_CONFLICT") || codes.includes("SUPERVISOR_CONFLICT") || codes.includes("ASSET_OFFICER_CONFLICT")) {
    return "POL_CONFLICT_CUSTODIAN_GUARD";
  }
  if (codes.includes("SLOT_TAKEN") || codes.includes("ALREADY_ASSIGNED")) return "POL_INSPECTION_SLOT";
  return "POL_INSPECTION_ELIGIBILITY";
}
__name(policyForCodes, "policyForCodes");
var todayIso2 = /* @__PURE__ */ __name(() => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10), "todayIso");
function daysBetween(fromIso, toIso) {
  const from = (/* @__PURE__ */ new Date(`${fromIso}T00:00:00Z`)).getTime();
  const to = (/* @__PURE__ */ new Date(`${toIso}T00:00:00Z`)).getTime();
  return Math.round((to - from) / 864e5);
}
__name(daysBetween, "daysBetween");
function summarizeInspectorAppointment(assignments, date = todayIso2()) {
  const inspectorRoles = assignments.filter((assignment) => assignment.roleId === "PEMERIKSA").sort((a, b) => a.validFrom < b.validFrom ? 1 : -1);
  if (inspectorRoles.length === 0) return null;
  const active = inspectorRoles.find((assignment) => isActiveOn(assignment, date));
  const latest = active ?? inspectorRoles[0];
  return {
    assignmentId: latest.id,
    validFrom: latest.validFrom,
    validTo: latest.validTo,
    activeToday: Boolean(active),
    daysRemaining: latest.validTo ? daysBetween(date, latest.validTo) : null
  };
}
__name(summarizeInspectorAppointment, "summarizeInspectorAppointment");
async function loadSchedulePolicyRow(db, id) {
  return db.prepare(
    `SELECT id, location_id AS locationId, department_id AS departmentId,
              tarikh_mula AS tarikhMula, tarikh_tamat AS tarikhTamat,
              pemeriksa1_id AS pemeriksa1Id, pemeriksa2_id AS pemeriksa2Id
       FROM inspection_schedules WHERE id = ? LIMIT 1`
  ).bind(id).first();
}
__name(loadSchedulePolicyRow, "loadSchedulePolicyRow");
async function evaluateInspectionEligibility(db, input) {
  const date = input.date ?? todayIso2();
  const { schedule, officerId } = input;
  const codes = [];
  const reasons = [];
  const deny = /* @__PURE__ */ __name((code, message) => {
    codes.push(code);
    reasons.push(message);
  }, "deny");
  const assignments = await listAssignmentsForOfficer(db, officerId);
  const appointment = summarizeInspectorAppointment(assignments, date);
  const active = /* @__PURE__ */ __name((assignment) => isActiveOn(assignment, date), "active");
  const inspectorAssignment = assignments.find(
    (assignment) => assignment.roleId === "PEMERIKSA" && active(assignment)
  );
  if (!inspectorAssignment) {
    if (appointment?.validTo && appointment.validTo < date) {
      deny(
        "APPOINTMENT_EXPIRED",
        `Lantikan Pegawai Pemeriksa anda telah tamat pada ${appointment.validTo}. Sila mohon pembaharuan lantikan sebelum menjalankan pemeriksaan.`
      );
    } else {
      deny(
        "NO_APPOINTMENT",
        "Anda belum dilantik sebagai Pegawai Pemeriksa. Hanya pegawai yang dilantik boleh melaksanakan pemeriksaan aset."
      );
    }
  } else {
    const coversPeriod = inspectorAssignment.validFrom <= schedule.tarikhTamat && (!inspectorAssignment.validTo || inspectorAssignment.validTo >= schedule.tarikhMula);
    if (!coversPeriod) {
      deny(
        "PERIOD_NOT_COVERED",
        `Lantikan pemeriksa anda (${inspectorAssignment.validFrom} hingga ${inspectorAssignment.validTo ?? "kekal"}) tidak meliputi tarikh pemeriksaan ${schedule.tarikhMula}.`
      );
    }
  }
  const supervises = assignments.some(
    (assignment) => assignment.roleId === "PENYELIA_LOKASI" && active(assignment) && (assignment.scopeType === "LOCATION" && assignment.scopeId === schedule.locationId || assignment.scopeType === "DEPARTMENT" && assignment.scopeId === schedule.departmentId)
  );
  if (supervises) {
    deny(
      "SUPERVISOR_CONFLICT",
      "Anda Penyelia Lokasi bagi ruang ini \u2014 pemeriksaan ruang sendiri tidak dibenarkan (1PP AM 2.4)."
    );
  }
  const isAssetOfficer = assignments.some(
    (assignment) => assignment.roleId === "PENOLONG_PEGAWAI_ASET" && active(assignment) && assignment.scopeType === "DEPARTMENT" && assignment.scopeId === schedule.departmentId
  );
  if (isAssetOfficer) {
    deny(
      "ASSET_OFFICER_CONFLICT",
      "Anda Penolong Pegawai Aset bagi jabatan pemilik aset ini \u2014 pemisahan tugas diperlukan."
    );
  }
  const custodian = await db.prepare("SELECT 1 AS ok FROM location_custodians WHERE location_id = ? AND officer_id = ? LIMIT 1").bind(schedule.locationId, officerId).first();
  if (custodian) {
    deny("CUSTODIAN_CONFLICT", "Anda pegawai penjaga (KEW.PA-7) bagi ruang ini.");
  }
  if (input.enforceCrossInspection && input.officerDepartmentId === schedule.departmentId) {
    deny(
      "CROSS_DEPARTMENT_REQUIRED",
      "Mod pemeriksaan silang (timbal balik) memerlukan pemeriksa dari jabatan lain."
    );
  }
  const assignedSlot = schedule.pemeriksa1Id === officerId ? 1 : schedule.pemeriksa2Id === officerId ? 2 : null;
  if (input.slot) {
    const occupantId = input.slot === 1 ? schedule.pemeriksa1Id : schedule.pemeriksa2Id;
    if (occupantId && occupantId !== officerId) {
      const occupantAssignments = await listAssignmentsForOfficer(db, occupantId);
      const occupantAppointed = occupantAssignments.some(
        (assignment) => assignment.roleId === "PEMERIKSA" && isActiveOn(assignment, date)
      );
      if (occupantAppointed) {
        deny("SLOT_TAKEN", `Slot Pemeriksa ${input.slot} telah dituntut oleh pegawai lain.`);
      }
    }
    if (assignedSlot && assignedSlot !== input.slot) {
      deny("ALREADY_ASSIGNED", `Anda sudah ditugaskan sebagai Pemeriksa ${assignedSlot} bagi jadual ini.`);
    }
  }
  return { allowed: reasons.length === 0, codes, reasons, appointment, assignedSlot };
}
__name(evaluateInspectionEligibility, "evaluateInspectionEligibility");

// src/lib/audit.ts
async function recordAudit(db, entry) {
  const id = `LOG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const details = JSON.stringify({
    resourceId: entry.resourceId ?? null,
    decision: entry.decision,
    policyId: entry.policyId,
    actedAsRole: entry.actedAsRole,
    reason: entry.reason ?? null,
    notes: entry.notes
  });
  await db.prepare(
    `INSERT INTO pbac_audit_logs
         (id, timestamp, actor_id, actor_name, role, action, details, department_id, status)
       VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    entry.actorId ?? null,
    entry.actorName,
    entry.actedAsRole,
    entry.action,
    details,
    entry.departmentId,
    entry.decision
  ).run();
}
__name(recordAudit, "recordAudit");

// src/lib/cycles.ts
var CYCLE_SELECT = `
  SELECT
    c.id,
    c.session_id AS sessionId,
    c.kod,
    c.mode,
    c.tarikh_mula AS tarikhMula,
    c.tarikh_tamat AS tarikhTamat,
    c.status,
    c.snapshot_at AS snapshotAt,
    c.created_at AS createdAt
  FROM inspection_cycles c
`;
async function listCycles(db) {
  const { results } = await db.prepare(`${CYCLE_SELECT} ORDER BY c.tarikh_mula DESC, c.created_at DESC LIMIT 100`).all();
  const cycles = results ?? [];
  const summaries = [];
  for (const cycle of cycles) {
    const counts = await db.prepare(
      `SELECT
           COUNT(DISTINCT location_id) AS totalLocations,
           SUM(CASE WHEN inspector_id IS NOT NULL THEN 1 ELSE 0 END) AS claimedSlots,
           SUM(CASE WHEN inspector_id IS NULL THEN 1 ELSE 0 END) AS openSlots
         FROM inspection_assignments WHERE cycle_id = ?`
    ).bind(cycle.id).first();
    const flags = await evaluateCycleFlags(db, cycle);
    summaries.push({
      ...cycle,
      totalLocations: Number(counts?.totalLocations) || 0,
      claimedSlots: Number(counts?.claimedSlots) || 0,
      openSlots: Number(counts?.openSlots) || 0,
      flaggedCount: flags.length
    });
  }
  return summaries;
}
__name(listCycles, "listCycles");
async function getCycle(db, id) {
  return db.prepare(`${CYCLE_SELECT} WHERE c.id = ? LIMIT 1`).bind(id).first();
}
__name(getCycle, "getCycle");
async function findActiveCycleForDate(db, date) {
  return db.prepare(
    `${CYCLE_SELECT}
       WHERE c.status = 'AKTIF' AND c.tarikh_mula <= ? AND c.tarikh_tamat >= ?
       ORDER BY c.tarikh_mula DESC LIMIT 1`
  ).bind(date, date).first();
}
__name(findActiveCycleForDate, "findActiveCycleForDate");
async function createCycle(db, input) {
  const year = input.tarikhMula.slice(0, 4) || String((/* @__PURE__ */ new Date()).getFullYear());
  const sessionId = input.sessionId ?? (await db.prepare("SELECT id FROM inspection_sessions WHERE tahun = ? LIMIT 1").bind(Number(year)).first())?.id ?? `SESI-${year}`;
  const exists = await db.prepare("SELECT id FROM inspection_sessions WHERE id = ? LIMIT 1").bind(sessionId).first();
  if (!exists) {
    await db.prepare(
      `INSERT INTO inspection_sessions (id, tahun, tarikh_mula, tarikh_tamat, tarikh_pra_jkpak)
         VALUES (?, ?, ?, ?, ?)`
    ).bind(sessionId, Number(year), input.tarikhMula, input.tarikhTamat, input.tarikhTamat).run();
  }
  const id = `KIT-${year}-${Date.now().toString(36).toUpperCase()}`;
  const kod = input.kod?.trim() || `KIT/${year}/${Date.now().toString(36).toUpperCase().slice(-4)}`;
  await db.prepare(
    `INSERT INTO inspection_cycles (id, session_id, kod, mode, tarikh_mula, tarikh_tamat, status)
       VALUES (?, ?, ?, ?, ?, ?, 'DRAF')`
  ).bind(id, sessionId, kod, input.mode ?? "SEHALA", input.tarikhMula, input.tarikhTamat).run();
  return await getCycle(db, id);
}
__name(createCycle, "createCycle");
async function generateCycleAssignments(db, cycle, options = {}) {
  const params = [cycle.tarikhTamat, cycle.tarikhMula];
  let deptClause = "";
  if (options.departmentId) {
    deptClause = " AND department_id = ?";
    params.push(options.departmentId);
  }
  const { results } = await db.prepare(
    `SELECT id, location_id, department_id
       FROM inspection_schedules
       WHERE tarikh_mula <= ? AND tarikh_tamat >= ?${deptClause}`
  ).bind(...params).all();
  const schedules = results ?? [];
  let created = 0;
  let skipped = 0;
  for (const schedule of schedules) {
    for (const slot of [1, 2]) {
      const existing = await db.prepare(
        `SELECT id FROM inspection_assignments
           WHERE cycle_id = ? AND location_id = ? AND slot = ? LIMIT 1`
      ).bind(cycle.id, schedule.location_id, slot).first();
      if (existing) {
        skipped += 1;
        continue;
      }
      await db.prepare(
        `INSERT INTO inspection_assignments
             (id, cycle_id, schedule_id, location_id, slot, status)
           VALUES (?, ?, ?, ?, ?, 'DITAWARKAN')`
      ).bind(
        `AG-${cycle.id.slice(-6)}-${Date.now().toString(36).toUpperCase()}-${slot}`,
        cycle.id,
        schedule.id,
        schedule.location_id,
        slot
      ).run();
      created += 1;
    }
  }
  return { created, schedules: schedules.length, skipped };
}
__name(generateCycleAssignments, "generateCycleAssignments");
async function startCycle(db, cycle, createdById) {
  const assignments = await listCycleAssignments(db, cycle.id);
  const payload = {
    cycle: {
      id: cycle.id,
      kod: cycle.kod,
      mode: cycle.mode,
      tarikhMula: cycle.tarikhMula,
      tarikhTamat: cycle.tarikhTamat
    },
    startedAt: (/* @__PURE__ */ new Date()).toISOString(),
    pairings: cycle.mode === "TIMBAL_BALIK" ? await buildReciprocalPairs(db, assignments) : [],
    assignments: assignments.map((assignment) => ({
      assignmentId: assignment.id,
      locationId: assignment.locationId,
      slot: assignment.slot,
      inspectorId: assignment.inspectorId,
      status: assignment.status
    }))
  };
  const snapshotId = `SNP-${Date.now().toString(36).toUpperCase()}`;
  await db.prepare(
    `INSERT INTO inspection_cycle_snapshots (id, cycle_id, payload, created_by_id)
       VALUES (?, ?, ?, ?)`
  ).bind(snapshotId, cycle.id, JSON.stringify(payload), createdById ?? null).run();
  await db.prepare(
    `UPDATE inspection_cycles
       SET status = 'AKTIF', snapshot_at = datetime('now')
       WHERE id = ?`
  ).bind(cycle.id).run();
  return {
    snapshotId,
    pairs: payload.pairings.length,
    assignments: assignments.length
  };
}
__name(startCycle, "startCycle");
async function closeCycle(db, id) {
  await db.prepare(
    `UPDATE inspection_cycles
       SET status = 'SELESAI'
       WHERE id = ?`
  ).bind(id).run();
}
__name(closeCycle, "closeCycle");
async function buildReciprocalPairs(db, assignments) {
  const officerDepartments = /* @__PURE__ */ new Map();
  for (const assignment of assignments) {
    if (!assignment.inspectorId || officerDepartments.has(assignment.inspectorId)) continue;
    const officer = await db.prepare("SELECT department_id AS dept FROM officers WHERE id = ? LIMIT 1").bind(assignment.inspectorId).first();
    officerDepartments.set(assignment.inspectorId, officer?.dept ?? null);
  }
  const byPair = /* @__PURE__ */ new Map();
  assignments.forEach((assignment) => {
    if (!assignment.inspectorId || !assignment.departmentId) return;
    const fromDept = officerDepartments.get(assignment.inspectorId);
    if (!fromDept) return;
    const key = `${fromDept}->${assignment.departmentId}`;
    const entry = byPair.get(key) ?? {
      fromDept,
      toDept: assignment.departmentId,
      assignments: []
    };
    entry.assignments.push(assignment.id);
    byPair.set(key, entry);
  });
  return Array.from(byPair.entries()).filter(([, value]) => byPair.has(`${value.toDept}->${value.fromDept}`)).map(([key, value]) => ({ key, ...value }));
}
__name(buildReciprocalPairs, "buildReciprocalPairs");
async function listCycleAssignments(db, cycleId) {
  const { results } = await db.prepare(
    `SELECT
         a.id,
         a.cycle_id AS cycleId,
         a.schedule_id AS scheduleId,
         a.location_id AS locationId,
         l.kod_ruang AS kodRuang,
         l.nama AS locationName,
         l.department_id AS departmentId,
         a.slot,
         a.inspector_id AS inspectorId,
         o.nama AS inspectorName,
         o.emel AS inspectorEmail,
         a.status,
         a.claimed_at AS claimedAt
       FROM inspection_assignments a
       LEFT JOIN locations l ON l.id = a.location_id
       LEFT JOIN officers o ON o.id = a.inspector_id
       WHERE a.cycle_id = ?
       ORDER BY l.kod_ruang ASC, a.slot ASC`
  ).bind(cycleId).all();
  return results ?? [];
}
__name(listCycleAssignments, "listCycleAssignments");
async function evaluateCycleFlags(db, cycle) {
  const assignments = await listCycleAssignments(db, cycle.id);
  const flags = [];
  for (const assignment of assignments) {
    if (!assignment.inspectorId) {
      flags.push({
        assignmentId: assignment.id,
        code: "NOT_CLAIMED",
        message: `Slot P${assignment.slot ?? "?"} bagi ${assignment.kodRuang ?? assignment.locationId} belum dituntut.`,
        severity: "info"
      });
      continue;
    }
    const schedule = assignment.scheduleId ? await loadSchedulePolicyRow(db, assignment.scheduleId) : null;
    if (!schedule) continue;
    const officer = await db.prepare("SELECT department_id AS dept FROM officers WHERE id = ? LIMIT 1").bind(assignment.inspectorId).first();
    const result = await evaluateInspectionEligibility(db, {
      officerId: assignment.inspectorId,
      officerDepartmentId: officer?.dept ?? "",
      schedule,
      enforceCrossInspection: cycle.mode === "TIMBAL_BALIK"
    });
    if (!result.allowed) {
      flags.push({
        assignmentId: assignment.id,
        code: result.codes[0],
        message: `${assignment.kodRuang ?? assignment.locationId}: ${result.reasons[0]}`,
        severity: result.codes[0] === "APPOINTMENT_EXPIRED" || result.codes[0] === "NO_APPOINTMENT" ? "critical" : "warning"
      });
    }
  }
  return flags;
}
__name(evaluateCycleFlags, "evaluateCycleFlags");
async function reassignCycleSlot(db, cycle, input) {
  const assignment = await db.prepare(
    `SELECT id, schedule_id AS scheduleId, inspector_id AS inspectorId, location_id AS locationId, slot
       FROM inspection_assignments WHERE id = ? AND cycle_id = ? LIMIT 1`
  ).bind(input.assignmentId, cycle.id).first();
  if (!assignment) {
    throw new Error("Penugasan tidak dijumpai dalam kitaran ini");
  }
  const denied = [];
  if (assignment.scheduleId) {
    const schedule = await loadSchedulePolicyRow(db, assignment.scheduleId);
    const officer = await db.prepare("SELECT department_id AS dept FROM officers WHERE id = ? LIMIT 1").bind(input.officerId).first();
    if (schedule) {
      const result = await evaluateInspectionEligibility(db, {
        officerId: input.officerId,
        officerDepartmentId: officer?.dept ?? "",
        schedule,
        enforceCrossInspection: cycle.mode === "TIMBAL_BALIK"
      });
      denied.push(...result.codes);
    }
    if (assignment.slot) {
      const column = assignment.slot === 1 ? "pemeriksa1_id" : "pemeriksa2_id";
      await db.prepare(
        `UPDATE inspection_schedules SET ${column} = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(input.officerId, assignment.scheduleId).run();
    }
  }
  await db.prepare(
    `UPDATE inspection_assignments
       SET inspector_id = ?, status = 'DITUNTUT', claimed_at = datetime('now')
       WHERE id = ?`
  ).bind(input.officerId, assignment.id).run();
  await db.prepare(
    `INSERT INTO inspection_reassignments
         (id, assignment_id, cycle_id, from_officer_id, to_officer_id, reason, note, created_by_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    `RAS-${Date.now().toString(36).toUpperCase()}`,
    assignment.id,
    cycle.id,
    assignment.inspectorId,
    input.officerId,
    input.reason,
    input.note ?? null,
    input.createdById ?? null
  ).run();
  const assignments = await listCycleAssignments(db, cycle.id);
  return {
    assignment: assignments.find((item) => item.id === assignment.id),
    denied
  };
}
__name(reassignCycleSlot, "reassignCycleSlot");
async function eligibleInspectorsForSchedule(db, scheduleId, date = todayIso2()) {
  const schedule = await loadSchedulePolicyRow(db, scheduleId);
  if (!schedule) return [];
  const { results } = await db.prepare(
    `SELECT DISTINCT o.id AS officerId, o.nama, o.emel, o.department_id AS dept
       FROM officers o
       JOIN role_assignments ra ON ra.officer_id = o.id
       WHERE ra.role_id = 'PEMERIKSA' AND ra.status = 'AKTIF'
         AND ra.valid_from <= ? AND (ra.valid_to IS NULL OR ra.valid_to >= ?)
       ORDER BY o.nama ASC`
  ).bind(date, date).all();
  const candidates = results ?? [];
  const eligible = [];
  for (const candidate of candidates) {
    const result = await evaluateInspectionEligibility(db, {
      officerId: candidate.officerId,
      officerDepartmentId: candidate.dept,
      schedule
    });
    if (result.allowed) eligible.push(candidate);
  }
  return eligible;
}
__name(eligibleInspectorsForSchedule, "eligibleInspectorsForSchedule");
async function syncClaimToCycle(db, params) {
  const schedule = await db.prepare("SELECT tarikh_mula AS tarikhMula FROM inspection_schedules WHERE id = ? LIMIT 1").bind(params.scheduleId).first();
  if (!schedule) return;
  const cycle = await findActiveCycleForDate(db, schedule.tarikhMula);
  if (!cycle) return;
  await db.prepare(
    `UPDATE inspection_assignments
       SET inspector_id = ?, schedule_id = ?, status = 'DITUNTUT', claimed_at = datetime('now')
       WHERE cycle_id = ? AND location_id = ? AND slot = ?`
  ).bind(params.officerId, params.scheduleId, cycle.id, params.locationId, params.slot).run();
}
__name(syncClaimToCycle, "syncClaimToCycle");

// src/lib/verification.ts
async function evaluateVerification(db, officerId, context2, date = todayIso2()) {
  const codes = [];
  const reasons = [];
  const deny = /* @__PURE__ */ __name((code, message) => {
    codes.push(code);
    reasons.push(message);
  }, "deny");
  const assignments = await listAssignmentsForOfficer(db, officerId);
  const active = /* @__PURE__ */ __name((roleId) => assignments.some((assignment) => assignment.roleId === roleId && isActiveOn(assignment, date)), "active");
  const canVerify = active("KETUA_JABATAN") || active("PENTADBIR_SISTEM") || active("PEMERIKSA");
  if (!canVerify) {
    deny(
      "NOT_VERIFIER_APPOINTED",
      "Anda tiada lantikan aktif sebagai Ketua Jabatan, Pentadbir Sistem atau Pegawai Pemeriksa untuk mengesahkan dapatan."
    );
  }
  if (context2.pemeriksa1Id === officerId || context2.pemeriksa2Id === officerId) {
    deny("SELF_VERIFICATION", "Anda pemeriksa bagi jadual ini \u2014 dapatan sendiri tidak boleh disahkan sendiri.");
  }
  const supervises = assignments.some(
    (assignment) => assignment.roleId === "PENYELIA_LOKASI" && isActiveOn(assignment, date) && (assignment.scopeType === "LOCATION" && assignment.scopeId === context2.locationId || assignment.scopeType === "DEPARTMENT" && assignment.scopeId === context2.departmentId)
  );
  if (supervises) {
    deny("SUPERVISES_LOCATION", "Anda menyelia lokasi/jabatan aset ini \u2014 pengesahan perlu pegawai bebas.");
  }
  const isAssetOfficer = assignments.some(
    (assignment) => assignment.roleId === "PENOLONG_PEGAWAI_ASET" && isActiveOn(assignment, date) && assignment.scopeType === "DEPARTMENT" && assignment.scopeId === context2.departmentId
  );
  if (isAssetOfficer) {
    deny(
      "ASSET_OFFICER_SAME_DEPT",
      "Anda Penolong Pegawai Aset bagi jabatan ini \u2014 pemisahan tugas diperlukan pada pengesahan."
    );
  }
  const custodian = await db.prepare("SELECT 1 AS ok FROM location_custodians WHERE location_id = ? AND officer_id = ? LIMIT 1").bind(context2.locationId, officerId).first();
  if (custodian) {
    deny("CUSTODIAN_OF_LOCATION", "Anda penjaga ruang ini \u2014 pengesahan dapatan mesti dibuat pegawai lain.");
  }
  if (context2.statusId !== "SELESAI") {
    deny("NOT_COMPLETED", "Hanya jadual berstatus Selesai boleh disahkan.");
  }
  return { allowed: reasons.length === 0, codes, reasons };
}
__name(evaluateVerification, "evaluateVerification");

// src/routes/schedules.ts
function mapSchedule(row) {
  const hasReport = row.bilElok !== null && row.bilElok !== void 0;
  return {
    id: row.id,
    kod: row.kod,
    jabatan: row.jabatan,
    lokasi: row.lokasi,
    kategori: row.kategori,
    kuantiti: Number(row.kuantiti) || 0,
    tarikhMula: row.tarikhMula,
    tarikhTamat: row.tarikhTamat,
    pemeriksa1: row.pemeriksa1,
    pemeriksa1Email: row.pemeriksa1Email ?? void 0,
    pemeriksa2: row.pemeriksa2,
    pemeriksa2Email: row.pemeriksa2Email ?? void 0,
    penjaga: row.penjaga,
    status: row.status,
    catatan: row.catatan ?? void 0,
    kewpa11DocKey: row.kewpa11DocKey ?? void 0,
    laporanPraJkpak: hasReport ? {
      baik: Number(row.bilElok) || 0,
      rosak: Number(row.bilRosak) || 0,
      usang: Number(row.bilUsang) || 0,
      hilang: Number(row.bilHilang) || 0,
      cadangan: row.syorTindakan ?? void 0,
      tarikhHantar: row.tarikhPengesahan ?? void 0
    } : void 0,
    createdBy: row.createdBy ?? void 0,
    createdAt: row.createdAt ?? void 0
  };
}
__name(mapSchedule, "mapSchedule");
async function findScheduleRow(db, id) {
  return db.prepare("SELECT * FROM v_schedules_full WHERE id = ? LIMIT 1").bind(id).first();
}
__name(findScheduleRow, "findScheduleRow");
async function findLocationId(db, value) {
  const row = await db.prepare(
    "SELECT id FROM locations WHERE id = ? OR kod_ruang = ? OR nama = ? COLLATE NOCASE LIMIT 1"
  ).bind(value, value, value).first();
  return row?.id ?? null;
}
__name(findLocationId, "findLocationId");
var schedulesRoute = new Hono3().get("/", async (c) => {
  const dept = c.req.query("dept");
  const status = c.req.query("status");
  try {
    const clauses = [];
    const params = [];
    if (dept && dept !== "SEMUA") {
      clauses.push("jabatan = ?");
      params.push(dept);
    }
    if (status && status !== "SEMUA") {
      clauses.push("status = ?");
      params.push(status);
    }
    const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    const { results } = await c.env.DB.prepare(
      `SELECT * FROM v_schedules_full ${where} ORDER BY tarikhMula ASC`
    ).bind(...params).all();
    const schedules = (results ?? []).map(mapSchedule);
    return c.json({
      success: true,
      total: schedules.length,
      data: schedules
    });
  } catch (e) {
    return c.json({ success: false, message: "Ralat mendapatkan jadual: " + e.message }, 500);
  }
}).post("/:id/claim", async (c) => {
  const id = c.req.param("id");
  const auth = getAuthUser(c);
  if (!auth) {
    return c.json(
      { success: false, code: "UNAUTHENTICATED", message: "Sesi tidak sah. Sila log masuk." },
      401
    );
  }
  try {
    const body = await c.req.json().catch(() => ({}));
    const slot = Number(body?.slot) === 2 ? 2 : 1;
    const schedule = await loadSchedulePolicyRow(c.env.DB, id);
    if (!schedule) {
      return c.json(
        { success: false, code: "NOT_FOUND", message: "Jadual pemeriksaan tidak dijumpai." },
        404
      );
    }
    const settings = await c.env.KV.get("system_settings", "json");
    const result = await evaluateInspectionEligibility(c.env.DB, {
      officerId: auth.id,
      officerDepartmentId: auth.dept,
      schedule,
      slot,
      enforceCrossInspection: settings?.enforceCrossInspection ?? true
    });
    if (!result.allowed) {
      await recordAudit(c.env.DB, {
        actorId: auth.id,
        actorName: auth.emel,
        actedAsRole: auth.role,
        action: "schedule:claim",
        departmentId: schedule.departmentId,
        decision: "DENY",
        policyId: policyForCodes(result.codes),
        resourceId: id,
        notes: result.reasons.join(" "),
        reason: result.codes[0] ?? null
      });
      return c.json(
        {
          success: false,
          code: "INELIGIBLE",
          message: result.reasons[0],
          reasons: result.reasons,
          codes: result.codes
        },
        403
      );
    }
    const column = slot === 1 ? "pemeriksa1_id" : "pemeriksa2_id";
    const runningStatusId = await resolveStatusId(c.env.DB, "Sedang Dijalankan");
    await c.env.DB.prepare(
      `UPDATE inspection_schedules
         SET ${column} = ?,
             status_id = CASE WHEN status_id = 'BELUM_MULA' THEN ? ELSE status_id END,
             updated_at = datetime('now')
         WHERE id = ?`
    ).bind(auth.id, runningStatusId, id).run();
    await syncClaimToCycle(c.env.DB, {
      scheduleId: id,
      locationId: schedule.locationId,
      slot,
      officerId: auth.id
    });
    await recordAudit(c.env.DB, {
      actorId: auth.id,
      actorName: auth.emel,
      actedAsRole: auth.role,
      action: "schedule:claim",
      departmentId: schedule.departmentId,
      decision: "PERMIT",
      policyId: "POL_INSPECTION_ELIGIBILITY",
      resourceId: id,
      notes: `Slot Pemeriksa ${slot} dituntut oleh ${auth.nama} (${auth.dept}). Lantikan aktif sehingga ${result.appointment?.validTo ?? "kekal"}.`
    });
    const saved = await findScheduleRow(c.env.DB, id);
    return c.json({
      success: true,
      message: `Slot Pemeriksa ${slot} berjaya dituntut.`,
      data: saved ? mapSchedule(saved) : null,
      appointment: result.appointment
    });
  } catch (e) {
    return c.json({ success: false, message: "Ralat menuntut slot: " + e.message }, 500);
  }
}).post("/", async (c) => {
  try {
    const body = await c.req.json();
    if (!body.lokasi || !body.jabatan || !body.tarikhMula || !body.tarikhTamat) {
      return c.json(
        { success: false, message: "Lokasi, Jabatan dan Tarikh Pemeriksaan wajib diisi" },
        400
      );
    }
    if (!body.pemeriksa1 || !body.pemeriksa2) {
      return c.json({ success: false, message: "Pemeriksa 1 dan Pemeriksa 2 wajib diisi" }, 400);
    }
    const departmentId = await resolveDepartmentId(c.env.DB, body.jabatan);
    if (!departmentId) {
      return c.json({ success: false, message: `Jabatan '${body.jabatan}' tidak dijumpai` }, 400);
    }
    const locationId = await findLocationId(c.env.DB, String(body.lokasi));
    if (!locationId) {
      return c.json(
        { success: false, message: `Lokasi '${body.lokasi}' tidak dijumpai dalam direktori ruang` },
        400
      );
    }
    const pemeriksa1Id = await ensureOfficerId(
      c.env.DB,
      { nama: body.pemeriksa1, emel: body.pemeriksa1Email },
      departmentId
    );
    const pemeriksa2Id = await ensureOfficerId(
      c.env.DB,
      { nama: body.pemeriksa2, emel: body.pemeriksa2Email },
      departmentId
    );
    const sessionId = await ensureSessionId(c.env.DB, String(body.tarikhMula));
    const assetCategoryId = await resolveAssetCategoryId(c.env.DB, body.kategori);
    const statusId = await resolveStatusId(c.env.DB, body.status);
    const createdById = body.createdBy ? await ensureOfficerId(
      c.env.DB,
      {
        emel: String(body.createdBy).includes("@") ? body.createdBy : null,
        nama: String(body.createdBy).includes("@") ? null : body.createdBy
      },
      departmentId
    ) : null;
    const year = String(body.tarikhMula).slice(0, 4) || String((/* @__PURE__ */ new Date()).getFullYear());
    const id = body.id || `JAD-${year}-${Date.now().toString(36).toUpperCase()}`;
    const insert = /* @__PURE__ */ __name((kod2) => c.env.DB.prepare(
      `INSERT INTO inspection_schedules (
            id, session_id, kod, location_id, department_id, asset_category_id,
            tarikh_mula, tarikh_tamat, pemeriksa1_id, pemeriksa2_id, status_id,
            catatan, created_by_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      sessionId,
      kod2,
      locationId,
      departmentId,
      assetCategoryId,
      body.tarikhMula,
      body.tarikhTamat,
      pemeriksa1Id,
      pemeriksa2Id,
      statusId,
      body.catatan || null,
      createdById
    ).run(), "insert");
    let kod = body.kod;
    if (!kod) {
      const countRow = await c.env.DB.prepare(
        "SELECT COUNT(*) AS total FROM inspection_schedules WHERE department_id = ? AND session_id = ?"
      ).bind(departmentId, sessionId).first();
      kod = `JAD/${departmentId}/${year}/${String((Number(countRow?.total) || 0) + 1).padStart(2, "0")}`;
    }
    try {
      await insert(kod);
    } catch (e) {
      if (/UNIQUE/i.test(e.message) && !body.kod) {
        kod = `JAD/${departmentId}/${year}/${Date.now().toString(36).toUpperCase()}`;
        await insert(kod);
      } else {
        throw e;
      }
    }
    const saved = await findScheduleRow(c.env.DB, id);
    return c.json(
      {
        success: true,
        message: "Jadual pemeriksaan berjaya disimpan di Cloudflare D1",
        data: saved ? mapSchedule(saved) : { id, kod }
      },
      201
    );
  } catch (e) {
    return c.json({ success: false, message: e.message }, 500);
  }
}).put("/:id", async (c) => {
  const id = c.req.param("id");
  try {
    const body = await c.req.json();
    const current = await c.env.DB.prepare(
      `SELECT id, department_id, location_id, tarikh_mula, tarikh_tamat, pemeriksa1_id, pemeriksa2_id
         FROM inspection_schedules WHERE id = ?`
    ).bind(id).first();
    if (!current) {
      return c.json({ success: false, message: "Jadual tidak dijumpai" }, 404);
    }
    const auth = getAuthUser(c);
    const isAdmin = auth ? await hasActiveRole(c.env.DB, auth.id, "PENTADBIR_SISTEM") : false;
    const changesInspectors = body.pemeriksa1 !== void 0 || body.pemeriksa1Email !== void 0 || body.pemeriksa2 !== void 0 || body.pemeriksa2Email !== void 0;
    if (changesInspectors && !isAdmin) {
      return c.json(
        {
          success: false,
          code: "USE_CLAIM_ENDPOINT",
          message: "Penetapan pemeriksa hanya dibenarkan melalui tuntutan slot (POST /api/schedules/:id/claim) atau oleh Pentadbir Sistem."
        },
        403
      );
    }
    const changesReport = body.status !== void 0 || body.laporanPraJkpak !== void 0 || body.kewpa11DocKey !== void 0;
    if (changesReport && !isAdmin) {
      const isAssignedInspector = Boolean(auth) && (current.pemeriksa1_id === auth?.id || current.pemeriksa2_id === auth?.id);
      if (!isAssignedInspector || !auth) {
        await recordAudit(c.env.DB, {
          actorId: auth?.id ?? null,
          actorName: auth?.emel ?? "tidak-dikenali",
          actedAsRole: auth?.role ?? "Tiada",
          action: "schedule:report_update",
          departmentId: current.department_id,
          decision: "DENY",
          policyId: "POL_INSPECTION_TASK_ASSIGNMENT",
          resourceId: id,
          notes: "Pegawai bukan pemeriksa yang ditugaskan bagi jadual ini.",
          reason: "NOT_ASSIGNED_INSPECTOR"
        });
        return c.json(
          {
            success: false,
            code: "NOT_ASSIGNED_INSPECTOR",
            message: "Hanya pemeriksa yang ditugaskan bagi jadual ini boleh mengemas kini laporan pemeriksaan."
          },
          403
        );
      }
      const assignments2 = await listAssignmentsForOfficer(c.env.DB, auth.id);
      const appointment = summarizeInspectorAppointment(assignments2);
      if (!appointment?.activeToday) {
        await recordAudit(c.env.DB, {
          actorId: auth.id,
          actorName: auth.emel,
          actedAsRole: auth.role,
          action: "schedule:report_update",
          departmentId: current.department_id,
          decision: "DENY",
          policyId: "POL_INSPECTOR_APPOINTMENT_REQUIRED",
          resourceId: id,
          notes: appointment?.validTo ? `Lantikan pemeriksa tamat pada ${appointment.validTo}.` : "Tiada lantikan pemeriksa aktif.",
          reason: appointment ? "APPOINTMENT_EXPIRED" : "NO_APPOINTMENT"
        });
        return c.json(
          {
            success: false,
            code: "APPOINTMENT_INACTIVE",
            message: appointment?.validTo ? `Lantikan pemeriksa anda telah tamat pada ${appointment.validTo}. Sila mohon pembaharuan lantikan.` : "Tiada lantikan Pegawai Pemeriksa yang aktif bagi akaun anda."
          },
          403
        );
      }
    }
    const assignments = [];
    const params = [];
    const set = /* @__PURE__ */ __name((column, value) => {
      assignments.push(`${column} = ?`);
      params.push(value);
    }, "set");
    if (body.tarikhMula !== void 0) set("tarikh_mula", body.tarikhMula);
    if (body.tarikhTamat !== void 0) set("tarikh_tamat", body.tarikhTamat);
    if (body.catatan !== void 0) set("catatan", body.catatan || null);
    if (body.kewpa11DocKey !== void 0) set("kewpa11_r2_key", body.kewpa11DocKey || null);
    if (body.status !== void 0) set("status_id", await resolveStatusId(c.env.DB, body.status));
    if (body.pemeriksa1 !== void 0 || body.pemeriksa1Email !== void 0) {
      const officerId = await ensureOfficerId(
        c.env.DB,
        { nama: body.pemeriksa1, emel: body.pemeriksa1Email },
        current.department_id
      );
      if (officerId) set("pemeriksa1_id", officerId);
    }
    if (body.pemeriksa2 !== void 0 || body.pemeriksa2Email !== void 0) {
      const officerId = await ensureOfficerId(
        c.env.DB,
        { nama: body.pemeriksa2, emel: body.pemeriksa2Email },
        current.department_id
      );
      if (officerId) set("pemeriksa2_id", officerId);
    }
    if (assignments.length > 0) {
      await c.env.DB.prepare(
        `UPDATE inspection_schedules SET ${assignments.join(", ")}, updated_at = datetime('now') WHERE id = ?`
      ).bind(...params, id).run();
    }
    if (body.laporanPraJkpak) {
      const report2 = body.laporanPraJkpak;
      const baik = Number(report2.baik) || 0;
      const rosak = Number(report2.rosak) || 0;
      const usang = Number(report2.usang) || 0;
      const hilang = Number(report2.hilang) || 0;
      await c.env.DB.prepare(
        `INSERT INTO inspection_reports (
            id, schedule_id, kuantiti_diperiksa, bil_elok, bil_rosak, bil_usang, bil_hilang,
            justifikasi_kerosakan, syor_tindakan, tarikh_pengesahan
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(schedule_id) DO UPDATE SET
            kuantiti_diperiksa = excluded.kuantiti_diperiksa,
            bil_elok = excluded.bil_elok,
            bil_rosak = excluded.bil_rosak,
            bil_usang = excluded.bil_usang,
            bil_hilang = excluded.bil_hilang,
            justifikasi_kerosakan = excluded.justifikasi_kerosakan,
            syor_tindakan = excluded.syor_tindakan,
            tarikh_pengesahan = excluded.tarikh_pengesahan`
      ).bind(
        `REP-${id}`,
        id,
        baik + rosak + usang + hilang,
        baik,
        rosak,
        usang,
        hilang,
        report2.justifikasiTidakDigunakan || report2.cadangan || null,
        report2.syorTindakanUsang || report2.cadangan || null,
        report2.tarikhHantar || null
      ).run();
    }
    const saved = await findScheduleRow(c.env.DB, id);
    return c.json({
      success: true,
      message: "Jadual berjaya dikemaskini",
      data: saved ? mapSchedule(saved) : void 0
    });
  } catch (e) {
    return c.json({ success: false, message: e.message }, 500);
  }
}).post("/:id/verify", async (c) => {
  const id = c.req.param("id");
  const auth = getAuthUser(c);
  if (!auth) {
    return c.json(
      { success: false, code: "UNAUTHENTICATED", message: "Sesi tidak sah. Sila log masuk." },
      401
    );
  }
  try {
    const row = await c.env.DB.prepare(
      `SELECT id, location_id AS locationId, department_id AS departmentId, status_id AS statusId,
                pemeriksa1_id AS pemeriksa1Id, pemeriksa2_id AS pemeriksa2Id
         FROM inspection_schedules WHERE id = ? LIMIT 1`
    ).bind(id).first();
    if (!row) {
      return c.json({ success: false, code: "NOT_FOUND", message: "Jadual tidak dijumpai." }, 404);
    }
    const result = await evaluateVerification(c.env.DB, auth.id, {
      scheduleId: row.id,
      locationId: row.locationId,
      departmentId: row.departmentId,
      statusId: row.statusId,
      pemeriksa1Id: row.pemeriksa1Id,
      pemeriksa2Id: row.pemeriksa2Id
    });
    if (!result.allowed) {
      await recordAudit(c.env.DB, {
        actorId: auth.id,
        actorName: auth.emel,
        actedAsRole: auth.role,
        action: "report:verify",
        departmentId: row.departmentId,
        decision: "DENY",
        policyId: "POL_SEPARATION_OF_DUTIES",
        resourceId: id,
        notes: result.reasons.join(" "),
        reason: result.codes[0] ?? null
      });
      return c.json(
        {
          success: false,
          code: "VERIFICATION_DENIED",
          message: result.reasons[0],
          reasons: result.reasons,
          codes: result.codes
        },
        403
      );
    }
    const verificationDate = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    await c.env.DB.prepare(
      `INSERT INTO inspection_reports
           (id, schedule_id, kuantiti_diperiksa, bil_elok, bil_rosak, bil_usang, bil_hilang,
            disahkan_oleh_id, tarikh_pengesahan)
         VALUES (?, ?, 0, 0, 0, 0, 0, ?, ?)
         ON CONFLICT(schedule_id) DO UPDATE SET
           disahkan_oleh_id = excluded.disahkan_oleh_id,
           tarikh_pengesahan = excluded.tarikh_pengesahan`
    ).bind(`REP-${id}`, id, auth.id, verificationDate).run();
    await recordAudit(c.env.DB, {
      actorId: auth.id,
      actorName: auth.emel,
      actedAsRole: auth.role,
      action: "report:verify",
      departmentId: row.departmentId,
      decision: "PERMIT",
      policyId: "POL_SEPARATION_OF_DUTIES",
      resourceId: id,
      notes: `Dapatan pemeriksaan disahkan oleh ${auth.nama} (${auth.role}) pada ${verificationDate}.`
    });
    const saved = await findScheduleRow(c.env.DB, id);
    return c.json({
      success: true,
      message: "Dapatan pemeriksaan disahkan.",
      data: saved ? mapSchedule(saved) : null,
      verifiedBy: { id: auth.id, nama: auth.nama, tarikh: verificationDate }
    });
  } catch (e) {
    return c.json({ success: false, message: "Ralat pengesahan dapatan: " + e.message }, 500);
  }
}).delete("/:id", async (c) => {
  const id = c.req.param("id");
  try {
    const existing = await c.env.DB.prepare("SELECT id FROM inspection_schedules WHERE id = ?").bind(id).first();
    if (!existing) {
      return c.json({ success: false, message: "Jadual tidak dijumpai" }, 404);
    }
    await c.env.DB.prepare("DELETE FROM inspection_reports WHERE schedule_id = ?").bind(id).run();
    await c.env.DB.prepare("DELETE FROM inspection_schedules WHERE id = ?").bind(id).run();
    return c.json({ success: true, message: "Jadual berjaya dipadam" });
  } catch (e) {
    return c.json({ success: false, message: e.message }, 500);
  }
});

// src/routes/kewpa7.ts
var kewpa7Route = new Hono3().post("/extract", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file");
    if (!file) {
      return c.json({ success: false, message: "Tiada fail KEW.PA-7 dimuat naik" }, 400);
    }
    const fileName = file.name.toLowerCase();
    const arrayBuffer = await file.arrayBuffer();
    const r2Key = `kewpa7/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    if (c.env.R2_BUCKET) {
      await c.env.R2_BUCKET.put(r2Key, arrayBuffer, {
        httpMetadata: { contentType: file.type || "application/pdf" },
        customMetadata: { originalName: file.name, uploadedAt: (/* @__PURE__ */ new Date()).toISOString() }
      });
    }
    let extractedData = null;
    let aiModelUsed = "Tiada";
    if (c.env.AI) {
      try {
        aiModelUsed = "@cf/meta/llama-3.1-8b-instruct";
        const aiResponse = await c.env.AI.run(aiModelUsed, {
          prompt: `
            Anda adalah pembantu AI rasmi untuk mengekstrak borang KEW.PA-7 Aset Alih Politeknik Kuching Sarawak.
            Fail: ${file.name} (saiz: ${file.size} bait).
            Sila hasilkan data JSON SAHAJA mengikut format ini:
            {
              "bahagian": "JABATAN KEJURUTERAAN MEKANIKAL",
              "lokasi": "BENGKEL HI-TECH",
              "kodLokasi": "130101 / BGN / JKM1 / 01 / B09",
              "pegawaiBertanggungjawabList": [
                { "id": "OFF-1", "nama": "Wilson Bin Intai", "jawatan": "PPPT" }
              ],
              "senaraiAset": [
                {
                  "bil": 1,
                  "noSiriPendaftaran": "KPT/PKS/H/07/13",
                  "keteranganAset": "MESIN PERALATAN ELEKTRIK",
                  "tarikhPenempatan": "09/06/2026",
                  "statusFizikal": "Baik"
                }
              ]
            }
            `,
          max_tokens: 1500
        });
        if (aiResponse?.response) {
          const raw2 = aiResponse.response.trim();
          const clean = raw2.replace(/```json/g, "").replace(/```/g, "").trim();
          extractedData = JSON.parse(clean);
        }
      } catch (aiErr) {
        console.warn("Workers AI extraction fallback to structured dataset:", aiErr);
      }
    }
    if (!extractedData) {
      return c.json(
        {
          success: false,
          message: "Pengekstrakan automatik gagal. Sila pastikan fail KEW.PA-7 mengandungi teks yang boleh dibaca atau isi maklumat secara manual."
        },
        422
      );
    }
    if (c.env.DB) {
      try {
        await c.env.DB.prepare(`
            INSERT INTO kewpa7_documents (id, r2_file_key, file_name, file_size, extracted_json, ai_model_used)
            VALUES (?, ?, ?, ?, ?, ?)
          `).bind(
          `K7-${Date.now()}`,
          r2Key,
          file.name,
          file.size,
          JSON.stringify(extractedData),
          aiModelUsed
        ).run();
      } catch (dbErr) {
        console.warn("Could not record into D1:", dbErr);
      }
    }
    return c.json({
      success: true,
      source: `Cloudflare Workers AI (${aiModelUsed}) & R2 Storage`,
      r2Key,
      data: extractedData
    });
  } catch (e) {
    return c.json({ success: false, message: "Ralat memproses KEW.PA-7: " + e.message }, 500);
  }
}).get("/documents", async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      "SELECT id, r2_file_key, file_name, file_size, ai_model_used, created_at FROM kewpa7_documents ORDER BY created_at DESC"
    ).all();
    return c.json({ success: true, data: results });
  } catch (e) {
    return c.json({ success: false, message: e.message }, 500);
  }
});

// src/routes/settings.ts
var defaultSettings = /* @__PURE__ */ __name(() => ({
  sesiTahun: String((/* @__PURE__ */ new Date()).getFullYear()),
  tarikhMulaSesi: "",
  tarikhTamatSesi: "",
  tarikhPraJkpak: "",
  ambangAmaranHari: 14,
  sasaranLiputanPeratus: 100,
  minimumPegawaiPemeriksa: 2,
  enforceCrossInspection: true,
  enforceCustodianGuard: true,
  enforceMaintenanceJustification: true,
  namaInstitusi: "Politeknik Kuching Sarawak"
}), "defaultSettings");
var KV_SETTINGS_KEY = "system_settings";
var settingsRoute = new Hono3().get("/", async (c) => {
  try {
    const kvData = await c.env.KV.get(KV_SETTINGS_KEY, "json");
    const baseline = defaultSettings();
    const settings = kvData ? { ...baseline, ...kvData } : baseline;
    return c.json({
      success: true,
      source: kvData ? "Cloudflare KV (Edge Cache)" : "System Defaults",
      data: settings
    });
  } catch (e) {
    return c.json({ success: true, source: "Fallback", data: defaultSettings() });
  }
}).put("/", async (c) => {
  try {
    const body = await c.req.json();
    const merged = {
      ...defaultSettings(),
      ...body
    };
    await c.env.KV.put(KV_SETTINGS_KEY, JSON.stringify(merged));
    return c.json({
      success: true,
      message: "Tetapan sistem berjaya disimpan ke Cloudflare KV",
      data: merged
    });
  } catch (e) {
    return c.json({ success: false, message: "Gagal mengemaskini KV: " + e.message }, 500);
  }
});

// src/routes/storage.ts
var storageRoute = new Hono3().post("/upload", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file");
    const category = formData.get("category") || "documents";
    if (!file) {
      return c.json({ success: false, message: "Tiada fail dimuat naik" }, 400);
    }
    const timestamp = Date.now();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const r2Key = `${category}/${timestamp}_${cleanFileName}`;
    const arrayBuffer = await file.arrayBuffer();
    await c.env.R2_BUCKET.put(r2Key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type || "application/pdf"
      },
      customMetadata: {
        originalName: file.name,
        uploadedAt: (/* @__PURE__ */ new Date()).toISOString(),
        size: file.size.toString()
      }
    });
    return c.json({
      success: true,
      message: "Fail berjaya disimpan ke Cloudflare R2",
      data: {
        key: r2Key,
        fileName: file.name,
        size: file.size,
        contentType: file.type,
        url: `/api/storage/file/${encodeURIComponent(r2Key)}`
      }
    }, 201);
  } catch (e) {
    return c.json({ success: false, message: "Ralat memuat naik fail ke R2: " + e.message }, 500);
  }
}).get("/file/:key", async (c) => {
  const key = decodeURIComponent(c.req.param("key"));
  try {
    const object = await c.env.R2_BUCKET.get(key);
    if (!object) {
      return c.json({ success: false, message: "Fail tidak dijumpai di Cloudflare R2" }, 404);
    }
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("Cache-Control", "public, max-age=31536000");
    return new Response(object.body, { headers });
  } catch (e) {
    return c.json({ success: false, message: e.message }, 500);
  }
}).delete("/file/:key", async (c) => {
  const key = decodeURIComponent(c.req.param("key"));
  try {
    await c.env.R2_BUCKET.delete(key);
    return c.json({ success: true, message: `Fail ${key} berjaya dipadam dari Cloudflare R2` });
  } catch (e) {
    return c.json({ success: false, message: e.message }, 500);
  }
});

// src/routes/ai.ts
var aiRoute = new Hono3().post("/justify-asset", async (c) => {
  try {
    const { assetName, category, issue, ageYears } = await c.req.json();
    if (!assetName || !issue) {
      return c.json({ success: false, message: "Nama aset dan isu kerosakan diperlukan" }, 400);
    }
    if (c.env.AI) {
      const response = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        prompt: `
          Sebagai Pegawai Pemeriksa Aset Kerajaan Malaysia (1PP AM 2.4) di Politeknik Kuching Sarawak:
          Aset: ${assetName}
          Kategori: ${category || "Aset Alih"}
          Umur Aset: ${ageYears || "5"} tahun
          Kerosakan/Isu: ${issue}

          Sila sediakan dalam bahasa Melayu rasmi:
          1. Justifikasi kerosakan/tidak ekonomi dibaiki
          2. Syor tindakan pelupusan atau penyelenggaraan (cth: Musnah / Jualan Sisa / Pindahan)
          3. Implikasi pematuhan keselamatan jika terus digunakan
          Pastikan format ringkas dan padat untuk dimasukkan ke dalam Borang Pra-JKPAK.
          `,
        max_tokens: 500
      });
      return c.json({
        success: true,
        model: "@cf/meta/llama-3.1-8b-instruct (Cloudflare Workers AI)",
        justification: response.response
      });
    }
    return c.json({
      success: true,
      model: "Local Rule Engine",
      justification: `Aset "${assetName}" telah mengalami kerosakan komponen utama (${issue}) melebihi nilai pembaikan ekonomi (BER). Disyorkan untuk pelupusan melalui kaedah sebut harga sisa atau pelupusan secara musnah mengikut tatacara 1PP AM 2.6.`
    });
  } catch (e) {
    return c.json({ success: false, message: "Ralat Workers AI: " + e.message }, 500);
  }
}).post("/check-compliance", async (c) => {
  try {
    const { totalLocations, completedLocations, crossDepartmentPairing } = await c.req.json();
    const coverageRate = totalLocations > 0 ? completedLocations / totalLocations * 100 : 0;
    const isFullCoverage = coverageRate >= 100;
    return c.json({
      success: true,
      data: {
        coverageRate: Math.round(coverageRate),
        isCompliant100Percent: isFullCoverage,
        status: isFullCoverage ? "Patuh 100%" : "Belum Mencapai Sasaran",
        recommendation: isFullCoverage ? "Pemeriksaan fizikal 100% selesai mengikut Para 24 1PP AM 2.4. Sedia untuk pembentangan JKPAK Suku Tahunan." : `Kadar liputan semasa ${Math.round(coverageRate)}%. Masih berbaki ${totalLocations - completedLocations} lokasi untuk diselesaikan sebelum tarikh ambang Pra-JKPAK.`
      }
    });
  } catch (e) {
    return c.json({ success: false, message: e.message }, 500);
  }
});

// src/routes/departments.ts
var departmentsRoute = new Hono3().get("/", async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT
           d.id,
           d.nama AS name,
           d.cross_partner_id AS crossPartnerId,
           d.ketua_jabatan AS ketuaJabatan,
           d.penolong_pegawai_aset AS penolongPegawaiAset,
           (SELECT COUNT(*) FROM locations l WHERE l.department_id = d.id) AS totalLokasi
         FROM departments d
         ORDER BY d.id ASC`
    ).all();
    return c.json({
      success: true,
      total: (results ?? []).length,
      data: results ?? []
    });
  } catch (e) {
    return c.json(
      { success: false, message: "Ralat mendapatkan senarai jabatan: " + e.message },
      500
    );
  }
});

// src/routes/officers.ts
var OFFICER_SELECT = `
  SELECT
    o.id,
    o.nama,
    o.emel,
    o.jawatan,
    o.gred,
    o.telefon,
    o.sambungan,
    o.department_id AS dept,
    o.peranan AS role,
    o.status
  FROM officers o
`;
var officersRoute = new Hono3().get("/", async (c) => {
  const dept = c.req.query("dept");
  try {
    const isFiltered = !!dept && dept !== "SEMUA";
    const statement = c.env.DB.prepare(
      `${OFFICER_SELECT} ${isFiltered ? "WHERE o.department_id = ?" : ""} ORDER BY o.nama ASC`
    );
    const { results } = isFiltered ? await statement.bind(dept).all() : await statement.all();
    return c.json({ success: true, total: (results ?? []).length, data: results ?? [] });
  } catch (e) {
    return c.json({ success: false, message: "Ralat mendapatkan direktori pegawai: " + e.message }, 500);
  }
}).post("/", async (c) => {
  try {
    const body = await c.req.json();
    if (!body.nama || !body.emel || !body.dept) {
      return c.json({ success: false, message: "Nama, e-mel dan jabatan wajib diisi" }, 400);
    }
    const departmentId = await resolveDepartmentId(c.env.DB, body.dept);
    if (!departmentId) {
      return c.json({ success: false, message: `Jabatan '${body.dept}' tidak dijumpai` }, 400);
    }
    const id = body.id || `PEG-${Date.now().toString(36).toUpperCase()}`;
    await c.env.DB.prepare(
      `INSERT INTO officers (id, nama, emel, jawatan, gred, telefon, sambungan, department_id, peranan, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      body.nama,
      body.emel,
      body.jawatan || body.role || "Pegawai",
      body.gred || body.grade || "-",
      body.telefon || body.phone || null,
      body.sambungan || body.ext || null,
      departmentId,
      body.role || body.peranan || "Pegawai Pemeriksa",
      body.status || "Aktif"
    ).run();
    await assignDefaultRoleForOfficer(c.env.DB, {
      officerId: id,
      roleValue: body.role || body.peranan,
      departmentId,
      createdById: getAuthUser(c)?.id ?? null
    });
    const saved = await c.env.DB.prepare(`${OFFICER_SELECT} WHERE o.id = ?`).bind(id).first();
    return c.json(
      { success: true, message: "Pegawai berjaya didaftarkan", data: saved },
      201
    );
  } catch (e) {
    const duplicate = /UNIQUE/i.test(e.message);
    return c.json(
      { success: false, message: duplicate ? "E-mel pegawai telah wujud" : e.message },
      duplicate ? 409 : 500
    );
  }
}).put("/:id", async (c) => {
  const identifier = c.req.param("id");
  try {
    const body = await c.req.json();
    const current = await c.env.DB.prepare(
      "SELECT id FROM officers WHERE id = ? OR emel = ? COLLATE NOCASE LIMIT 1"
    ).bind(identifier, identifier).first();
    if (!current) {
      return c.json({ success: false, message: "Pegawai tidak dijumpai" }, 404);
    }
    const assignments = [];
    const params = [];
    const set = /* @__PURE__ */ __name((column, value) => {
      assignments.push(`${column} = ?`);
      params.push(value);
    }, "set");
    if (body.nama !== void 0) set("nama", body.nama);
    if (body.emel !== void 0) set("emel", body.emel);
    if (body.jawatan !== void 0) set("jawatan", body.jawatan);
    if (body.gred !== void 0) set("gred", body.gred);
    if (body.grade !== void 0) set("gred", body.grade);
    if (body.telefon !== void 0) set("telefon", body.telefon);
    if (body.phone !== void 0) set("telefon", body.phone);
    if (body.sambungan !== void 0) set("sambungan", body.sambungan);
    if (body.ext !== void 0) set("sambungan", body.ext);
    if (body.role !== void 0) set("peranan", body.role);
    if (body.status !== void 0) set("status", body.status);
    if (body.dept !== void 0) {
      const departmentId = await resolveDepartmentId(c.env.DB, body.dept);
      if (!departmentId) {
        return c.json({ success: false, message: `Jabatan '${body.dept}' tidak dijumpai` }, 400);
      }
      set("department_id", departmentId);
    }
    if (assignments.length > 0) {
      await c.env.DB.prepare(
        `UPDATE officers SET ${assignments.join(", ")}, updated_at = datetime('now') WHERE id = ?`
      ).bind(...params, current.id).run();
    }
    const saved = await c.env.DB.prepare(`${OFFICER_SELECT} WHERE o.id = ?`).bind(current.id).first();
    return c.json({ success: true, message: "Maklumat pegawai dikemaskini", data: saved });
  } catch (e) {
    const duplicate = /UNIQUE/i.test(e.message);
    return c.json(
      { success: false, message: duplicate ? "E-mel pegawai telah wujud" : e.message },
      duplicate ? 409 : 500
    );
  }
}).delete("/:id", async (c) => {
  const identifier = c.req.param("id");
  try {
    const existing = await c.env.DB.prepare(
      "SELECT id FROM officers WHERE id = ? OR emel = ? COLLATE NOCASE LIMIT 1"
    ).bind(identifier, identifier).first();
    if (!existing) {
      return c.json({ success: false, message: "Pegawai tidak dijumpai" }, 404);
    }
    await c.env.DB.prepare("DELETE FROM officers WHERE id = ?").bind(existing.id).run();
    return c.json({ success: true, message: "Pegawai berjaya dipadam" });
  } catch (e) {
    const referenced = /FOREIGN KEY/i.test(e.message);
    return c.json(
      {
        success: false,
        message: referenced ? "Pegawai tidak boleh dipadam kerana masih dirujuk oleh lokasi atau jadual pemeriksaan" : e.message
      },
      referenced ? 409 : 500
    );
  }
});

// src/routes/audit.ts
function mapAuditLog(row) {
  return {
    id: row.id,
    userEmail: row.userEmail ?? "sistem@poliku.edu.my",
    action: row.action,
    resourceId: row.resourceId ?? void 0,
    decision: row.decision === "DENY" ? "DENY" : "PERMIT",
    policyId: row.policyId ?? "POL_PBAC",
    actedAsRole: row.actedAsRole ?? void 0,
    reason: row.reason ?? void 0,
    notes: row.notes ?? "",
    timestamp: row.timestamp
  };
}
__name(mapAuditLog, "mapAuditLog");
var auditRoute = new Hono3().get("/", async (c) => {
  const limit = Math.min(Number(c.req.query("limit")) || 200, 500);
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT
           id,
           timestamp,
           actor_name AS userEmail,
           action,
           json_extract(details, '$.resourceId') AS resourceId,
           json_extract(details, '$.decision') AS decision,
           json_extract(details, '$.policyId') AS policyId,
           COALESCE(json_extract(details, '$.actedAsRole'), role) AS actedAsRole,
           json_extract(details, '$.reason') AS reason,
           COALESCE(json_extract(details, '$.notes'), details) AS notes,
           status
         FROM pbac_audit_logs
         ORDER BY timestamp DESC, id DESC
         LIMIT ?`
    ).bind(limit).all();
    return c.json({
      success: true,
      total: (results ?? []).length,
      data: (results ?? []).map(mapAuditLog)
    });
  } catch (e) {
    return c.json({ success: false, message: "Ralat mendapatkan jejak audit: " + e.message }, 500);
  }
}).post("/", async (c) => {
  try {
    const body = await c.req.json();
    if (!body.action) {
      return c.json({ success: false, message: "Tindakan audit wajib diisi" }, 400);
    }
    const auth = getAuthUser(c);
    const userEmail = auth?.emel ?? String(body.userEmail || "sistem@poliku.edu.my");
    const officer = auth ? await c.env.DB.prepare(
      "SELECT id, nama, department_id, peranan FROM officers WHERE id = ? LIMIT 1"
    ).bind(auth.id).first() : await c.env.DB.prepare(
      "SELECT id, nama, department_id, peranan FROM officers WHERE emel = ? COLLATE NOCASE LIMIT 1"
    ).bind(userEmail).first();
    const fallbackDept = await c.env.DB.prepare(
      "SELECT id FROM departments ORDER BY id ASC LIMIT 1"
    ).first();
    const departmentId = officer?.department_id ?? body.dept ?? fallbackDept?.id;
    if (!departmentId) {
      return c.json(
        { success: false, message: "Jabatan tidak dijumpai untuk merekod audit" },
        400
      );
    }
    const id = `LOG-${Date.now().toString(36).toUpperCase()}`;
    const decision = body.decision === "DENY" ? "DENY" : "PERMIT";
    const actedAsRole = officer?.peranan ?? body.actedAsRole ?? body.role ?? "Sistem";
    const details = JSON.stringify({
      resourceId: body.resourceId ?? null,
      decision,
      policyId: body.policyId ?? "POL_PBAC",
      actedAsRole,
      reason: body.reason ?? null,
      notes: body.notes ?? ""
    });
    await c.env.DB.prepare(
      `INSERT INTO pbac_audit_logs (id, timestamp, actor_id, actor_name, role, action, details, department_id, status)
         VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      officer?.id ?? null,
      userEmail,
      actedAsRole,
      body.action,
      details,
      departmentId,
      decision
    ).run();
    const saved = await c.env.DB.prepare(
      `SELECT
           id,
           timestamp,
           actor_name AS userEmail,
           action,
           json_extract(details, '$.resourceId') AS resourceId,
           json_extract(details, '$.decision') AS decision,
           json_extract(details, '$.policyId') AS policyId,
           COALESCE(json_extract(details, '$.actedAsRole'), role) AS actedAsRole,
           json_extract(details, '$.reason') AS reason,
           COALESCE(json_extract(details, '$.notes'), details) AS notes,
           status
         FROM pbac_audit_logs WHERE id = ?`
    ).bind(id).first();
    return c.json(
      { success: true, message: "Jejak audit direkodkan", data: saved ? mapAuditLog(saved) : void 0 },
      201
    );
  } catch (e) {
    return c.json({ success: false, message: "Gagal merekod audit: " + e.message }, 500);
  }
});

// src/routes/auth.ts
var OFFICIAL_EMAIL = /@(?:poliku\.edu\.my|(?:[a-z0-9-]+\.)+gov\.my)$/i;
var PROFILE_SELECT = `
  SELECT
    o.id,
    o.nama,
    o.emel,
    o.gred,
    o.telefon,
    o.sambungan,
    o.department_id AS dept,
    o.peranan AS role,
    o.status
  FROM officers o
  WHERE o.id = ?
  LIMIT 1
`;
var notConfigured = /* @__PURE__ */ __name(() => ({
  success: false,
  code: "AUTH_NOT_CONFIGURED",
  message: "Pengesahan belum dikonfigurasi pada Worker. Tetapkan JWT_SECRET melalui `wrangler secret put JWT_SECRET`."
}), "notConfigured");
async function findOfficerByUsername(db, username) {
  return db.prepare(
    `SELECT o.id, o.nama, o.emel, o.peranan AS role, o.department_id AS dept
       FROM officers o
       WHERE o.emel = ? COLLATE NOCASE
          OR lower(substr(o.emel, 1, instr(o.emel, '@') - 1)) = lower(?)
       LIMIT 1`
  ).bind(username, username).first();
}
__name(findOfficerByUsername, "findOfficerByUsername");
async function loadProfile(db, officerId) {
  return db.prepare(PROFILE_SELECT).bind(officerId).first();
}
__name(loadProfile, "loadProfile");
async function issueSession(env2, officer) {
  const secret = getSecret(env2);
  if (!secret) return null;
  const { token, expiresAt } = await signToken({ id: officer.id, emel: officer.emel }, secret);
  const user = await loadProfile(env2.DB, officer.id);
  return { token, expiresAt, user };
}
__name(issueSession, "issueSession");
async function readCredential(db, officerId) {
  return db.prepare("SELECT officer_id, salt, password_hash, iterations FROM officer_credentials WHERE officer_id = ?").bind(officerId).first();
}
__name(readCredential, "readCredential");
async function writeCredential(env2, officerId, emel, password) {
  const iterations = resolveIterations(env2);
  const salt = createSalt();
  const hash = await hashPassword(password, salt, iterations);
  await env2.DB.prepare(
    `INSERT INTO officer_credentials (officer_id, emel, password_hash, salt, iterations, activated_at, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
     ON CONFLICT(officer_id) DO UPDATE SET
       emel = excluded.emel,
       password_hash = excluded.password_hash,
       salt = excluded.salt,
       iterations = excluded.iterations,
       updated_at = datetime('now')`
  ).bind(officerId, emel, hash, salt, iterations).run();
}
__name(writeCredential, "writeCredential");
var authRoute = new Hono3().post("/login", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const username = String(body?.username ?? "").trim();
    const password = String(body?.password ?? "");
    if (!username || !password) {
      return c.json(
        { success: false, code: "INVALID_INPUT", message: "Nama pengguna dan kata laluan wajib diisi." },
        400
      );
    }
    const officer = await findOfficerByUsername(c.env.DB, username);
    if (!officer) {
      return c.json(
        {
          success: false,
          code: "UNKNOWN_USER",
          message: "Nama pengguna tidak ditemui dalam direktori pegawai."
        },
        404
      );
    }
    const credential = await readCredential(c.env.DB, officer.id);
    if (!credential) {
      return c.json(
        {
          success: false,
          code: "ACTIVATION_REQUIRED",
          message: "Akaun belum diaktifkan. Tetapkan kata laluan baharu untuk meneruskan.",
          data: { email: officer.emel, name: officer.nama }
        },
        409
      );
    }
    const valid = await verifyPassword(
      password,
      credential.salt,
      credential.iterations,
      credential.password_hash
    );
    if (!valid) {
      return c.json(
        { success: false, code: "INVALID_PASSWORD", message: "Kata laluan tidak sah." },
        401
      );
    }
    const session = await issueSession(c.env, officer);
    if (!session) return c.json(notConfigured(), 503);
    return c.json({ success: true, message: "Log masuk berjaya.", data: session });
  } catch (e) {
    return c.json({ success: false, message: "Ralat log masuk: " + e.message }, 500);
  }
}).post("/activate", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const username = String(body?.username ?? "").trim();
    const password = String(body?.password ?? "");
    if (!username || !password) {
      return c.json(
        { success: false, code: "INVALID_INPUT", message: "Nama pengguna dan kata laluan wajib diisi." },
        400
      );
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return c.json(
        {
          success: false,
          code: "WEAK_PASSWORD",
          message: `Kata laluan mestilah sekurang-kurangnya ${MIN_PASSWORD_LENGTH} aksara.`
        },
        400
      );
    }
    const officer = await findOfficerByUsername(c.env.DB, username);
    if (!officer) {
      return c.json(
        {
          success: false,
          code: "UNKNOWN_USER",
          message: "Nama pengguna tidak ditemui dalam direktori pegawai."
        },
        404
      );
    }
    if (await readCredential(c.env.DB, officer.id)) {
      return c.json(
        {
          success: false,
          code: "ALREADY_ACTIVE",
          message: "Akaun ini telah diaktifkan. Sila log masuk menggunakan kata laluan sedia ada."
        },
        409
      );
    }
    await writeCredential(c.env, officer.id, officer.emel, password);
    const session = await issueSession(c.env, officer);
    if (!session) return c.json(notConfigured(), 503);
    return c.json(
      { success: true, message: "Akaun berjaya diaktifkan.", data: session },
      201
    );
  } catch (e) {
    return c.json({ success: false, message: "Ralat pengaktifan akaun: " + e.message }, 500);
  }
}).post("/register", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const nama = String(body.nama ?? "").trim();
    const emel = String(body.emel ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const role = String(body.role ?? "").trim() || "Pegawai Pemeriksa";
    if (!nama || !emel || !body.dept) {
      return c.json(
        { success: false, code: "INVALID_INPUT", message: "Nama, emel dan jabatan wajib diisi." },
        400
      );
    }
    if (!OFFICIAL_EMAIL.test(emel)) {
      return c.json(
        {
          success: false,
          code: "INVALID_DOMAIN",
          message: "Akses ditolak: gunakan emel rasmi @poliku.edu.my atau domain .gov.my."
        },
        400
      );
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return c.json(
        {
          success: false,
          code: "WEAK_PASSWORD",
          message: `Kata laluan mestilah sekurang-kurangnya ${MIN_PASSWORD_LENGTH} aksara.`
        },
        400
      );
    }
    const existing = await c.env.DB.prepare(
      "SELECT id FROM officers WHERE emel = ? COLLATE NOCASE LIMIT 1"
    ).bind(emel).first();
    if (existing) {
      return c.json(
        { success: false, code: "EMAIL_EXISTS", message: "Emel pegawai telah didaftarkan." },
        409
      );
    }
    const departmentId = await resolveDepartmentId(c.env.DB, body.dept);
    if (!departmentId) {
      return c.json(
        { success: false, code: "UNKNOWN_DEPARTMENT", message: `Jabatan '${body.dept}' tidak dijumpai.` },
        400
      );
    }
    const id = `PEG-${Date.now().toString(36).toUpperCase()}`;
    await c.env.DB.prepare(
      `INSERT INTO officers (id, nama, emel, jawatan, gred, telefon, sambungan, department_id, peranan, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Aktif')`
    ).bind(
      id,
      nama,
      emel,
      role,
      String(body.gred ?? "-").trim() || "-",
      body.telefon ?? null,
      body.sambungan ?? null,
      departmentId,
      role
    ).run();
    await writeCredential(c.env, id, emel, password);
    await assignDefaultRoleForOfficer(c.env.DB, {
      officerId: id,
      roleValue: role,
      departmentId,
      createdById: null
    });
    const session = await issueSession(c.env, { id, nama, emel, role, dept: departmentId });
    if (!session) return c.json(notConfigured(), 503);
    return c.json(
      { success: true, message: "Akaun pegawai berjaya didaftarkan.", data: session },
      201
    );
  } catch (e) {
    const duplicate = /UNIQUE/i.test(e.message);
    return c.json(
      {
        success: false,
        code: duplicate ? "EMAIL_EXISTS" : "REGISTER_FAILED",
        message: duplicate ? "Emel pegawai telah didaftarkan." : "Ralat pendaftaran: " + e.message
      },
      duplicate ? 409 : 500
    );
  }
}).get("/me", requireAuth, async (c) => {
  const auth = getAuthUser(c);
  if (!auth) {
    return c.json({ success: false, code: "UNAUTHENTICATED", message: "Sesi tidak sah." }, 401);
  }
  const user = await loadProfile(c.env.DB, auth.id);
  const assignments = await listAssignmentsForOfficer(c.env.DB, auth.id);
  return c.json({
    success: true,
    data: {
      user,
      assignments,
      appointment: summarizeInspectorAppointment(assignments)
    }
  });
}).post("/password", requireAuth, async (c) => {
  try {
    const auth = getAuthUser(c);
    if (!auth) {
      return c.json({ success: false, code: "UNAUTHENTICATED", message: "Sesi tidak sah." }, 401);
    }
    const body = await c.req.json().catch(() => ({}));
    const currentPassword = String(body?.currentPassword ?? "");
    const newPassword = String(body?.newPassword ?? "");
    if (!currentPassword) {
      return c.json(
        { success: false, code: "INVALID_INPUT", message: "Sila masukkan kata laluan semasa." },
        400
      );
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return c.json(
        {
          success: false,
          code: "WEAK_PASSWORD",
          message: `Kata laluan baharu mestilah sekurang-kurangnya ${MIN_PASSWORD_LENGTH} aksara.`
        },
        400
      );
    }
    const credential = await readCredential(c.env.DB, auth.id);
    if (!credential) {
      return c.json(
        { success: false, code: "ACTIVATION_REQUIRED", message: "Akaun belum diaktifkan." },
        409
      );
    }
    const valid = await verifyPassword(
      currentPassword,
      credential.salt,
      credential.iterations,
      credential.password_hash
    );
    if (!valid) {
      return c.json(
        { success: false, code: "INVALID_PASSWORD", message: "Kata laluan semasa tidak sah." },
        401
      );
    }
    await writeCredential(c.env, auth.id, auth.emel, newPassword);
    return c.json({ success: true, message: "Kata laluan berjaya dikemaskini." });
  } catch (e) {
    return c.json({ success: false, message: "Ralat menukar kata laluan: " + e.message }, 500);
  }
});

// src/routes/roles.ts
var VALID_SCOPES = ["GLOBAL", "DEPARTMENT", "LOCATION"];
var todayIso3 = /* @__PURE__ */ __name(() => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10), "todayIso");
async function resolveOfficerId(db, officerId, email) {
  if (officerId) {
    return db.prepare("SELECT id, department_id AS departmentId FROM officers WHERE id = ? LIMIT 1").bind(officerId).first();
  }
  if (email) {
    return db.prepare(
      "SELECT id, department_id AS departmentId FROM officers WHERE emel = ? COLLATE NOCASE LIMIT 1"
    ).bind(email).first();
  }
  return null;
}
__name(resolveOfficerId, "resolveOfficerId");
var rolesRoute = new Hono3().get("/", async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT id, nama, scope_type AS scopeType, default_tenure_months AS defaultTenureMonths, keterangan
       FROM roles
       ORDER BY nama ASC`
    ).all();
    const data = results?.length ? results : ROLE_DEFINITIONS;
    return c.json({ success: true, total: data.length, data });
  } catch {
    return c.json({ success: true, total: ROLE_DEFINITIONS.length, data: ROLE_DEFINITIONS });
  }
});
var roleAssignmentsRoute = new Hono3().get("/", async (c) => {
  try {
    const email = c.req.query("email");
    const officer = await resolveOfficerId(c.env.DB, c.req.query("officerId"), email);
    if ((c.req.query("officerId") || email) && !officer) {
      return c.json({ success: false, code: "UNKNOWN_OFFICER", message: "Pegawai tidak dijumpai." }, 404);
    }
    const data = await listAssignments(c.env.DB, {
      officerId: officer?.id,
      roleId: c.req.query("roleId") ?? void 0,
      status: c.req.query("status") ?? void 0
    });
    return c.json({ success: true, total: data.length, data });
  } catch (e) {
    return c.json({ success: false, message: "Ralat mendapatkan lantikan: " + e.message }, 500);
  }
}).post("/", requireRole("PENTADBIR_SISTEM"), async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const roleId = resolveRoleId(body?.roleId ?? body?.role);
    if (!roleId) {
      return c.json(
        {
          success: false,
          code: "UNKNOWN_ROLE",
          message: `Peranan '${body?.roleId ?? body?.role ?? ""}' tidak sah.`
        },
        400
      );
    }
    const definition = roleDefinition(roleId);
    if (!definition) {
      return c.json({ success: false, code: "UNKNOWN_ROLE", message: "Peranan tidak sah." }, 400);
    }
    const officer = await resolveOfficerId(c.env.DB, body?.officerId, body?.officerEmail ?? body?.emel);
    if (!officer) {
      return c.json({ success: false, code: "UNKNOWN_OFFICER", message: "Pegawai tidak dijumpai." }, 404);
    }
    const scopeType = String(body?.scopeType ?? definition.scopeType).toUpperCase() ?? definition.scopeType;
    if (!VALID_SCOPES.includes(scopeType)) {
      return c.json(
        { success: false, code: "INVALID_SCOPE", message: `Skop '${scopeType}' tidak sah.` },
        400
      );
    }
    let scopeId = null;
    if (scopeType === "DEPARTMENT") {
      scopeId = await resolveDepartmentId(c.env.DB, body?.scopeId ?? officer.departmentId) ?? null;
      if (!scopeId) {
        return c.json(
          { success: false, code: "UNKNOWN_DEPARTMENT", message: "Jabatan skop tidak dijumpai." },
          400
        );
      }
    } else if (scopeType === "LOCATION") {
      const location = await c.env.DB.prepare("SELECT id FROM locations WHERE id = ? LIMIT 1").bind(String(body?.scopeId ?? "")).first();
      if (!location) {
        return c.json(
          { success: false, code: "UNKNOWN_LOCATION", message: "Lokasi skop tidak dijumpai." },
          400
        );
      }
      scopeId = location.id;
    }
    const auth = getAuthUser(c);
    const result = await assignRole(c.env.DB, {
      officerId: officer.id,
      roleId,
      scopeType,
      scopeId,
      validFrom: body?.validFrom ?? null,
      validTo: body?.validTo ?? null,
      createdById: auth?.id ?? null,
      notes: body?.notes ?? null
    });
    return c.json(
      {
        success: true,
        message: result.created ? `Lantikan ${definition.nama} berjaya ditambah.` : `Lantikan ${definition.nama} bagi skop ini sudah aktif.`,
        data: result.assignment
      },
      result.created ? 201 : 200
    );
  } catch (e) {
    return c.json({ success: false, message: "Ralat menambah lantikan: " + e.message }, 500);
  }
}).put("/:id", requireRole("PENTADBIR_SISTEM"), async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => ({}));
    const action = String(body?.action ?? "end").toLowerCase();
    const current = await getAssignment(c.env.DB, id);
    if (!current) {
      return c.json({ success: false, code: "NOT_FOUND", message: "Lantikan tidak dijumpai." }, 404);
    }
    if (action === "end") {
      if (current.status === "DITAMATKAN") {
        return c.json(
          { success: false, code: "ALREADY_ENDED", message: "Lantikan ini telah ditamatkan." },
          409
        );
      }
      const validTo = String(body?.validTo ?? todayIso3());
      await c.env.DB.prepare(
        `UPDATE role_assignments
           SET status = 'DITAMATKAN', valid_to = ?, updated_at = datetime('now')
           WHERE id = ?`
      ).bind(validTo, id).run();
      return c.json({
        success: true,
        message: "Lantikan ditamatkan. Rekod sejarah dikekalkan.",
        data: await getAssignment(c.env.DB, id)
      });
    }
    if (action === "renew") {
      const validFrom = String(body?.validFrom ?? todayIso3());
      await c.env.DB.prepare(
        `UPDATE role_assignments
           SET status = 'DITAMATKAN', valid_to = ?, updated_at = datetime('now')
           WHERE id = ?`
      ).bind(validFrom, id).run();
      const auth = getAuthUser(c);
      const result = await assignRole(c.env.DB, {
        officerId: current.officerId,
        roleId: current.roleId,
        scopeType: current.scopeType,
        scopeId: current.scopeId,
        validFrom,
        validTo: body?.validTo ?? null,
        createdById: auth?.id ?? null,
        notes: body?.notes ?? `Pembaharuan lantikan ${current.roleName}`
      });
      return c.json(
        { success: true, message: "Lantikan diperbaharui sebagai rekod baharu.", data: result.assignment },
        201
      );
    }
    return c.json(
      { success: false, code: "INVALID_ACTION", message: "Tindakan mesti 'end' atau 'renew'." },
      400
    );
  } catch (e) {
    return c.json({ success: false, message: "Ralat mengemas kini lantikan: " + e.message }, 500);
  }
});

// src/routes/cycles.ts
var VALID_MODES = ["SEHALA", "TIMBAL_BALIK"];
var DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
var cyclesRoute = new Hono3().get("/", async (c) => {
  try {
    const data = await listCycles(c.env.DB);
    return c.json({ success: true, total: data.length, data });
  } catch (e) {
    return c.json({ success: false, message: "Ralat mendapatkan kitaran: " + e.message }, 500);
  }
}).get("/:id", async (c) => {
  try {
    const cycle = await getCycle(c.env.DB, c.req.param("id"));
    if (!cycle) {
      return c.json({ success: false, code: "NOT_FOUND", message: "Kitaran tidak dijumpai." }, 404);
    }
    const [assignments, flags] = await Promise.all([
      listCycleAssignments(c.env.DB, cycle.id),
      evaluateCycleFlags(c.env.DB, cycle)
    ]);
    return c.json({ success: true, data: { cycle, assignments, flags } });
  } catch (e) {
    return c.json({ success: false, message: "Ralat mendapatkan butiran kitaran: " + e.message }, 500);
  }
}).get("/:id/eligible", async (c) => {
  try {
    const cycle = await getCycle(c.env.DB, c.req.param("id"));
    if (!cycle) {
      return c.json({ success: false, code: "NOT_FOUND", message: "Kitaran tidak dijumpai." }, 404);
    }
    const scheduleId = c.req.query("scheduleId");
    if (!scheduleId) {
      return c.json(
        { success: false, code: "INVALID_INPUT", message: "Parameter scheduleId diperlukan." },
        400
      );
    }
    const data = await eligibleInspectorsForSchedule(c.env.DB, scheduleId);
    return c.json({ success: true, total: data.length, data });
  } catch (e) {
    return c.json({ success: false, message: "Ralat mendapatkan pegawai layak: " + e.message }, 500);
  }
}).post("/", requireRole("PENTADBIR_SISTEM"), async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const tarikhMula = String(body?.tarikhMula ?? "").trim();
    const tarikhTamat = String(body?.tarikhTamat ?? "").trim();
    const mode = String(body?.mode ?? "SEHALA").toUpperCase();
    if (!DATE_PATTERN.test(tarikhMula) || !DATE_PATTERN.test(tarikhTamat)) {
      return c.json(
        { success: false, code: "INVALID_INPUT", message: "Tarikh mula/tamat mesti format YYYY-MM-DD." },
        400
      );
    }
    if (tarikhTamat < tarikhMula) {
      return c.json(
        { success: false, code: "INVALID_INPUT", message: "Tarikh tamat mesti selepas tarikh mula." },
        400
      );
    }
    if (!VALID_MODES.includes(mode)) {
      return c.json(
        { success: false, code: "INVALID_MODE", message: "Mod mesti 'SEHALA' atau 'TIMBAL_BALIK'." },
        400
      );
    }
    const cycle = await createCycle(c.env.DB, {
      sessionId: body?.sessionId ?? null,
      kod: body?.kod ?? null,
      mode,
      tarikhMula,
      tarikhTamat
    });
    const auth = getAuthUser(c);
    await recordAudit(c.env.DB, {
      actorId: auth?.id ?? null,
      actorName: auth?.emel ?? "sistem",
      actedAsRole: auth?.role ?? "Pentadbir Sistem",
      action: "cycle:create",
      departmentId: auth?.dept ?? "PENTADBIRAN",
      decision: "PERMIT",
      policyId: "POL_INSPECTION_CYCLE",
      resourceId: cycle.id,
      notes: `Kitaran ${cycle.kod} (${cycle.mode}) ${cycle.tarikhMula} hingga ${cycle.tarikhTamat} dicipta.`
    });
    return c.json({ success: true, message: "Kitaran pemeriksaan dicipta.", data: cycle }, 201);
  } catch (e) {
    return c.json({ success: false, message: "Ralat mencipta kitaran: " + e.message }, 500);
  }
}).post("/:id/generate", requireRole("PENTADBIR_SISTEM"), async (c) => {
  try {
    const cycle = await getCycle(c.env.DB, c.req.param("id"));
    if (!cycle) {
      return c.json({ success: false, code: "NOT_FOUND", message: "Kitaran tidak dijumpai." }, 404);
    }
    if (cycle.status === "SELESAI") {
      return c.json(
        { success: false, code: "CYCLE_CLOSED", message: "Kitaran telah ditutup; penjanaan tidak dibenarkan." },
        409
      );
    }
    const body = await c.req.json().catch(() => ({}));
    const result = await generateCycleAssignments(c.env.DB, cycle, {
      departmentId: body?.departmentId ?? null
    });
    const auth = getAuthUser(c);
    await recordAudit(c.env.DB, {
      actorId: auth?.id ?? null,
      actorName: auth?.emel ?? "sistem",
      actedAsRole: auth?.role ?? "Pentadbir Sistem",
      action: "cycle:generate",
      departmentId: auth?.dept ?? "PENTADBIRAN",
      decision: "PERMIT",
      policyId: "POL_INSPECTION_CYCLE",
      resourceId: cycle.id,
      notes: `Penjanaan kolam: ${result.created} penugasan baharu daripada ${result.schedules} jadual.`
    });
    return c.json({
      success: true,
      message: `${result.created} penugasan baharu dijana (${result.skipped} sedia ada dilangkau).`,
      data: result
    });
  } catch (e) {
    return c.json({ success: false, message: "Ralat menjana penugasan: " + e.message }, 500);
  }
}).post("/:id/start", requireRole("PENTADBIR_SISTEM"), async (c) => {
  try {
    const cycle = await getCycle(c.env.DB, c.req.param("id"));
    if (!cycle) {
      return c.json({ success: false, code: "NOT_FOUND", message: "Kitaran tidak dijumpai." }, 404);
    }
    if (cycle.status === "AKTIF") {
      return c.json({ success: false, code: "ALREADY_ACTIVE", message: "Kitaran sudah aktif." }, 409);
    }
    if (cycle.status === "SELESAI") {
      return c.json({ success: false, code: "CYCLE_CLOSED", message: "Kitaran telah ditutup." }, 409);
    }
    const assignments = await listCycleAssignments(c.env.DB, cycle.id);
    if (assignments.length === 0) {
      return c.json(
        {
          success: false,
          code: "NO_ASSIGNMENTS",
          message: "Jana penugasan terlebih dahulu sebelum memulakan kitaran."
        },
        409
      );
    }
    const auth = getAuthUser(c);
    const result = await startCycle(c.env.DB, cycle, auth?.id ?? null);
    await recordAudit(c.env.DB, {
      actorId: auth?.id ?? null,
      actorName: auth?.emel ?? "sistem",
      actedAsRole: auth?.role ?? "Pentadbir Sistem",
      action: "cycle:start",
      departmentId: auth?.dept ?? "PENTADBIRAN",
      decision: "PERMIT",
      policyId: cycle.mode === "TIMBAL_BALIK" ? "POL_CROSS_INSPECTION_MANDATE" : "POL_INSPECTION_CYCLE",
      resourceId: cycle.id,
      notes: `Kitaran ${cycle.kod} dimulakan; snapshot ${result.snapshotId} dengan ${result.pairs} pasangan timbal balik dikunci.`
    });
    return c.json({
      success: true,
      message: `Kitaran dimulakan. ${result.pairs} pasangan timbal balik dikunci dalam snapshot.`,
      data: { snapshotId: result.snapshotId, pairs: result.pairs, assignments: result.assignments }
    });
  } catch (e) {
    return c.json({ success: false, message: "Ralat memulakan kitaran: " + e.message }, 500);
  }
}).post("/:id/close", requireRole("PENTADBIR_SISTEM"), async (c) => {
  try {
    const cycle = await getCycle(c.env.DB, c.req.param("id"));
    if (!cycle) {
      return c.json({ success: false, code: "NOT_FOUND", message: "Kitaran tidak dijumpai." }, 404);
    }
    await closeCycle(c.env.DB, cycle.id);
    const auth = getAuthUser(c);
    await recordAudit(c.env.DB, {
      actorId: auth?.id ?? null,
      actorName: auth?.emel ?? "sistem",
      actedAsRole: auth?.role ?? "Pentadbir Sistem",
      action: "cycle:close",
      departmentId: auth?.dept ?? "PENTADBIRAN",
      decision: "PERMIT",
      policyId: "POL_INSPECTION_CYCLE",
      resourceId: cycle.id,
      notes: `Kitaran ${cycle.kod} ditutup.`
    });
    return c.json({ success: true, message: "Kitaran ditutup.", data: await getCycle(c.env.DB, cycle.id) });
  } catch (e) {
    return c.json({ success: false, message: "Ralat menutup kitaran: " + e.message }, 500);
  }
}).post("/:id/reassign", requireRole("PENTADBIR_SISTEM"), async (c) => {
  try {
    const cycle = await getCycle(c.env.DB, c.req.param("id"));
    if (!cycle) {
      return c.json({ success: false, code: "NOT_FOUND", message: "Kitaran tidak dijumpai." }, 404);
    }
    if (cycle.status === "SELESAI") {
      return c.json({ success: false, code: "CYCLE_CLOSED", message: "Kitaran telah ditutup." }, 409);
    }
    const body = await c.req.json().catch(() => ({}));
    const assignmentId = String(body?.assignmentId ?? "").trim();
    const officerId = String(body?.officerId ?? "").trim();
    const reason = String(body?.reason ?? "").trim();
    if (!assignmentId || !officerId) {
      return c.json(
        { success: false, code: "INVALID_INPUT", message: "assignmentId dan officerId diperlukan." },
        400
      );
    }
    if (!reason) {
      return c.json(
        { success: false, code: "INVALID_INPUT", message: "Sebab penugasan semula wajib dinyatakan." },
        400
      );
    }
    const auth = getAuthUser(c);
    const result = await reassignCycleSlot(c.env.DB, cycle, {
      assignmentId,
      officerId,
      reason,
      note: body?.note ?? null,
      createdById: auth?.id ?? null
    });
    await recordAudit(c.env.DB, {
      actorId: auth?.id ?? null,
      actorName: auth?.emel ?? "sistem",
      actedAsRole: auth?.role ?? "Pentadbir Sistem",
      action: "cycle:reassign",
      departmentId: auth?.dept ?? "PENTADBIRAN",
      decision: result.denied.length ? "DENY" : "PERMIT",
      policyId: "POL_INSPECTION_REASSIGNMENT",
      resourceId: assignmentId,
      notes: `Penugasan semula slot ${result.assignment.slot} bagi ${result.assignment.kodRuang ?? result.assignment.locationId}: ${reason}`,
      reason: result.denied[0] ?? null
    });
    return c.json({
      success: true,
      message: result.denied.length ? "Penugasan disimpan, tetapi pegawai ini mempunyai isu kelayakan \u2014 semak flag kitaran." : "Penugasan semula berjaya direkod.",
      data: result.assignment,
      codes: result.denied
    });
  } catch (e) {
    return c.json({ success: false, message: "Ralat penugasan semula: " + e.message }, 500);
  }
});

// src/lib/notices.ts
var NOTICE_WINDOW_DAYS = 60;
var NOTICE_SELECT = `
  SELECT
    n.id,
    n.assignment_id AS assignmentId,
    n.officer_id AS officerId,
    o.nama AS officerName,
    o.emel AS officerEmail,
    n.role_id AS roleId,
    r.nama AS roleName,
    n.jenis,
    n.tarikh_luput AS tarikhLuput,
    n.mesej,
    n.severity,
    n.status,
    n.created_at AS createdAt
  FROM tenure_notices n
  LEFT JOIN officers o ON o.id = n.officer_id
  LEFT JOIN roles r ON r.id = n.role_id
`;
async function scanTenureNotices(db, windowDays = NOTICE_WINDOW_DAYS) {
  const { results } = await db.prepare(
    `SELECT
         ra.id,
         ra.officer_id AS officerId,
         ra.role_id AS roleId,
         ra.valid_to AS validTo,
         o.nama AS officerName,
         r.nama AS roleName
       FROM role_assignments ra
       JOIN officers o ON o.id = ra.officer_id
       JOIN roles r ON r.id = ra.role_id
       WHERE ra.status = 'AKTIF'
         AND ra.valid_to IS NOT NULL
         AND ra.valid_to <= date('now', '+' || ? || ' days')`
  ).bind(windowDays).all();
  const assignments = results ?? [];
  let created = 0;
  for (const assignment of assignments) {
    const expired = assignment.validTo < (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const jenis = expired ? "TAMAT" : "LUPUT_60_HARI";
    const severity = expired ? "critical" : "warning";
    const mesej = expired ? `Lantikan ${assignment.roleName} bagi ${assignment.officerName} telah tamat pada ${assignment.validTo}. Pembaharuan diperlukan sebelum tugasan pemeriksaan baharu.` : `Lantikan ${assignment.roleName} bagi ${assignment.officerName} akan tamat pada ${assignment.validTo} (dalam tempoh ${windowDays} hari). Sila rancang pembaharuan.`;
    const result = await db.prepare(
      `INSERT INTO tenure_notices
           (id, assignment_id, officer_id, role_id, jenis, tarikh_luput, mesej, severity)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(assignment_id, jenis) DO NOTHING`
    ).bind(
      `NTF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      assignment.id,
      assignment.officerId,
      assignment.roleId,
      jenis,
      assignment.validTo,
      mesej,
      severity
    ).run();
    created += Number(result.meta.changes) || 0;
  }
  return { created, scanned: assignments.length };
}
__name(scanTenureNotices, "scanTenureNotices");
async function listTenureNotices(db, options = {}) {
  const clauses = [];
  const params = [];
  if (options.officerId) {
    clauses.push("n.officer_id = ?");
    params.push(options.officerId);
  }
  if (options.status) {
    clauses.push("n.status = ?");
    params.push(options.status);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { results } = await db.prepare(`${NOTICE_SELECT} ${where} ORDER BY n.status ASC, n.tarikh_luput ASC LIMIT 200`).bind(...params).all();
  return results ?? [];
}
__name(listTenureNotices, "listTenureNotices");
async function markNoticeRead(db, id) {
  const result = await db.prepare(
    `UPDATE tenure_notices
       SET status = 'DIBACA', read_at = datetime('now')
       WHERE id = ? AND status = 'BARU'`
  ).bind(id).run();
  return (Number(result.meta.changes) || 0) > 0;
}
__name(markNoticeRead, "markNoticeRead");

// src/routes/notices.ts
var noticesRoute = new Hono3().get("/", requireAuth, async (c) => {
  const auth = getAuthUser(c);
  if (!auth) {
    return c.json(
      { success: false, code: "UNAUTHENTICATED", message: "Sesi tidak sah. Sila log masuk." },
      401
    );
  }
  try {
    const scope = c.req.query("scope");
    const status = c.req.query("status") ?? void 0;
    const officerId = scope === "all" ? await (async () => {
      const admin = await c.env.DB.prepare(
        `SELECT 1 AS ok FROM role_assignments
                 WHERE officer_id = ? AND role_id = 'PENTADBIR_SISTEM' AND status = 'AKTIF'
                   AND valid_from <= date('now') AND (valid_to IS NULL OR valid_to >= date('now'))
                 LIMIT 1`
      ).bind(auth.id).first();
      return admin ? null : auth.id;
    })() : null;
    const data = await listTenureNotices(c.env.DB, {
      officerId: officerId ?? (scope === "all" ? null : auth.id),
      status
    });
    return c.json({
      success: true,
      total: data.length,
      unread: data.filter((notice) => notice.status === "BARU").length,
      data
    });
  } catch (e) {
    return c.json({ success: false, message: "Ralat mendapatkan notifikasi: " + e.message }, 500);
  }
}).post("/scan", requireRole("PENTADBIR_SISTEM"), async (c) => {
  try {
    const result = await scanTenureNotices(c.env.DB);
    const auth = getAuthUser(c);
    await recordAudit(c.env.DB, {
      actorId: auth?.id ?? null,
      actorName: auth?.emel ?? "sistem",
      actedAsRole: auth?.role ?? "Pentadbir Sistem",
      action: "tenure:scan",
      departmentId: auth?.dept ?? "PENTADBIRAN",
      decision: "PERMIT",
      policyId: "POL_INSPECTOR_APPOINTMENT_REQUIRED",
      notes: `Imbasan lantikan: ${result.created} notifikasi baharu daripada ${result.scanned} lantikan.`
    });
    return c.json({
      success: true,
      message: `${result.created} notifikasi baharu dijana (${result.scanned} lantikan diperiksa).`,
      data: result
    });
  } catch (e) {
    return c.json({ success: false, message: "Ralat imbasan lantikan: " + e.message }, 500);
  }
}).post("/:id/read", async (c) => {
  const auth = getAuthUser(c);
  if (!auth) {
    return c.json(
      { success: false, code: "UNAUTHENTICATED", message: "Sesi tidak sah. Sila log masuk." },
      401
    );
  }
  try {
    const id = c.req.param("id");
    const notice = await c.env.DB.prepare(
      "SELECT officer_id AS officerId FROM tenure_notices WHERE id = ? LIMIT 1"
    ).bind(id).first();
    if (!notice) {
      return c.json({ success: false, code: "NOT_FOUND", message: "Notifikasi tidak dijumpai." }, 404);
    }
    const isAdmin = await c.env.DB.prepare(
      `SELECT 1 AS ok FROM role_assignments
         WHERE officer_id = ? AND role_id = 'PENTADBIR_SISTEM' AND status = 'AKTIF'
         LIMIT 1`
    ).bind(auth.id).first();
    if (!isAdmin && notice.officerId !== auth.id) {
      return c.json(
        { success: false, code: "FORBIDDEN", message: "Anda hanya boleh menanda notifikasi sendiri." },
        403
      );
    }
    const changed = await markNoticeRead(c.env.DB, id);
    return c.json({
      success: true,
      message: changed ? "Notifikasi ditanda dibaca." : "Notifikasi sudah dibaca."
    });
  } catch (e) {
    return c.json({ success: false, message: "Ralat menanda notifikasi: " + e.message }, 500);
  }
});

// src/index.ts
var app = new Hono3();
app.use("*", logger());
app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  exposeHeaders: ["Content-Length", "X-Kuma-Revision"],
  maxAge: 86400
}));
app.get("/", (c) => {
  return c.json({
    service: "Portal Pengurusan Aset Alih & e-JAS POLIKU Backend",
    version: "1.0.0",
    platform: "Cloudflare Workers (Edge Serverless)",
    stack: {
      framework: "Hono v4 + Hono RPC",
      database: "Cloudflare D1 (SQLite)",
      cache: "Cloudflare KV (Edge Storage)",
      storage: "Cloudflare R2 (S3-compatible)",
      ai: "Cloudflare Workers AI (@cf/meta/llama-3.1-8b-instruct)"
    },
    status: "ONLINE",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.get("/health", (c) => c.json({ status: "ok", time: Date.now() }));
var PUBLIC_MUTATION_PATHS = /* @__PURE__ */ new Set([
  "/api/auth/login",
  "/api/auth/activate",
  "/api/auth/register"
]);
app.use("/api/*", async (c, next) => {
  const method = c.req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return next();
  if (PUBLIC_MUTATION_PATHS.has(new URL(c.req.url).pathname)) return next();
  return requireAuth(c, next);
});
var routes = app.route("/api/auth", authRoute).route("/api/roles", rolesRoute).route("/api/role-assignments", roleAssignmentsRoute).route("/api/cycles", cyclesRoute).route("/api/notices", noticesRoute).route("/api/locations", locationsRoute).route("/api/schedules", schedulesRoute).route("/api/departments", departmentsRoute).route("/api/officers", officersRoute).route("/api/audit-logs", auditRoute).route("/api/kewpa7", kewpa7Route).route("/api/settings", settingsRoute).route("/api/storage", storageRoute).route("/api/ai", aiRoute);
async function handleScheduled(env2) {
  try {
    const result = await scanTenureNotices(env2.DB);
    console.log(
      `[cron] Imbasan lantikan selesai: ${result.created} notifikasi baharu daripada ${result.scanned} lantikan.`
    );
  } catch (error3) {
    console.error("[cron] Imbasan lantikan gagal:", error3);
  }
}
__name(handleScheduled, "handleScheduled");
var index_default = {
  fetch: app.fetch,
  scheduled: /* @__PURE__ */ __name(async (_controller, env2, _ctx) => {
    await handleScheduled(env2);
  }, "scheduled")
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
