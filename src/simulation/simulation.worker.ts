import { simulate } from "./engine";
self.onmessage = (event) => {
  try {
    const result = simulate(event.data, (progress) =>
      self.postMessage({ type: "progress", progress }),
    );
    self.postMessage({ type: "result", result });
  } catch (error) {
    self.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : "החישוב נכשל",
    });
  }
};
