import { generateResponse, generateChatTitle } from "../services/ai.service.js";
import chatModel from "../models/chat.model.js"
import messageModel from "../models/message.model.js";
import { getIO } from "../sockets/server.socket.js";

export async function sendMessage(req, res) {
    const { message, chat: chatId } = req.body;
    const socketId = req.get("x-socket-id");
    const requestId = req.get("x-request-id");

    try {
        let title = null;
        let chat = null;
        const activeChatId = chatId;

        if (!activeChatId) {
            title = await generateChatTitle(message);
            chat = await chatModel.create({
                user: req.user.id,
                title
            });
        }

        const resolvedChatId = activeChatId || chat._id;

        await messageModel.create({
            chat: resolvedChatId,
            content: message,
            role: "user"
        });

        const messages = await messageModel.find({ chat: resolvedChatId });
        const result = await generateResponse(messages);

        const aiMessage = await messageModel.create({
            chat: resolvedChatId,
            content: result,
            role: "ai"
        });

        const payload = {
            reply: result,
            chatId: resolvedChatId.toString(),
            title: chat?.title || null,
            requestId
        };

        if (socketId) {
            getIO().to(socketId).emit("ai-response", payload);
        }

        return res.status(201).json({
            title,
            chat,
            chatId: resolvedChatId.toString(),
            aiMessage,
            requestId
        });
    } catch (error) {
        console.error("Error processing chat message:", error);

        if (socketId) {
            getIO().to(socketId).emit("ai-error", {
                error: error.message,
                requestId
            });
        }

        return res.status(500).json({
            message: "Unable to process chat message",
            error: error.message,
            requestId
        });
    }

}

export async function getChats(req, res) {
    const user = req.user

    const chats = await chatModel.find({ user: user.id })

    res.status(200).json({
        message: "Chats retrieved successfully",
        chats
    })
}

export async function getMessages(req, res) {
    const { chatId } = req.params;

    const chat = await chatModel.findOne({
        _id: chatId,
        user: req.user.id
    })

    if (!chat) {
        return res.status(404).json({
            message: "Chat not found"
        })
    }

    const messages = await messageModel.find({
        chat: chatId
    })

    res.status(200).json({
        message: "Messages retrieved successfully",
        messages
    })
}

export async function deleteChat(req, res) {

    const { chatId } = req.params;

    const chat = await chatModel.findOneAndDelete({
        _id: chatId,
        user: req.user.id
    })

    await messageModel.deleteMany({
        chat: chatId
    })

    if (!chat) {
        return res.status(404).json({
            message: "Chat not found"
        })
    }

    res.status(200).json({
        message: "Chat deleted successfully"
    })
}