
import { Schema, model, models } from "mongoose";

const ConversationSchema = new Schema({
  userId: {
    type: String,
    required: true,
  },
  chatId: {
    type: String,
    required: true,
    unique: true,
  },
  messages: {
    type: Array,
    required: true,
  },
  selectedDataset : {
    type: Array,
    
  },
  title: {
    type: String,
    required: true,
  },
  lastUpdated: {
    type: Date,
    required: true,
  }
});

const Conversation = models?.Conversation || model("Conversation", ConversationSchema);

export default Conversation;
