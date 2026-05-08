declare const Bun: {
  spawn(cmd: string[], opts?: { stdout?: "pipe" | "inherit"; stderr?: "pipe" | "inherit" }): {
    exited: Promise<number>;
    stdout: ReadableStream;
    stderr: ReadableStream;
  };
  file(path: string): { arrayBuffer(): Promise<ArrayBuffer>; size: number; type: string };
};
