declare module "socket.io-client" {
  export interface Socket {
    emit(event: string, ...args: unknown[]): this;
    on<T>(event: string, listener: (data: T) => void): this;
    disconnect(): this;
  }

  export interface SocketOptions {
    path?: string;
  }

  export function io(opts?: SocketOptions): Socket;
  export default io;
}
