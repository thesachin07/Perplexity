import { socket } from "../../../socket";

export const initializeSocketConnection = () => {
    if (!socket.connected) {
        socket.connect();
    }

    return socket;
};

export { socket };