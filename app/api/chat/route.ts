import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import OpenAI from "openai";

const openai = new OpenAI();

interface Dataset {
  topic: string;
  startdate: string;
  enddate: string;
  title: string;
  url: string;
  organization: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  image?: string;
}

interface ChatRequest {
  messages: Message[];
  datasets: Dataset[];
}

interface AnalysisResult {
  result: string;
}

const analysisTool = {
  type: 'function' as const,
  function: {
    name: 'analyze_data',
    description: 'Analyze datasets using statistical methods and create visualizations. Use this only when the query explicitly requires data analysis, calculations, or visualizations.',
    parameters: {
      type: 'object',
      properties: {
        urls: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of dataset URLs to analyze'
        },
        query: {
          type: 'string',
          description: 'Step by Step Instructions for data analysis'
        }
      },
      required: ['urls', 'query']
    }
  }
};

async function analyze_data(urls: string[], query: string): Promise<AnalysisResult> {
  const flaskServerUrl = process.env.FLASK_SERVER_URL || 'http://localhost:8000';
  
  const response = await fetch(`${flaskServerUrl}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ urls, query }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error from analysis server');
  }

  return await response.json();
}

async function encodeImage(imagePath: string): Promise<{ base64: string, mimeType: string }> {
  try {
    const imageBuffer = await fs.readFile(imagePath);
    const extension = path.extname(imagePath).toLowerCase();
    const mimeType = extension === '.png' ? 'image/png' : 
                     extension === '.jpg' || extension === '.jpeg' ? 'image/jpeg' : 
                     extension === '.svg' ? 'image/svg+xml' : 
                     'image/png';
    
    // Fix: Convert Buffer to string using toString('base64')
    const base64 = imageBuffer.toString('base64');
    
    return { base64, mimeType };
  } catch (error) {
    console.error('Error encoding image:', error);
    throw new Error('Failed to encode image');
  }
}

type ChatContent = {
  type: "text";
  text: string;
} | {
  type: "image_url";
  image_url: { url: string };
};

async function processAnalysisResult(result: AnalysisResult, query: string): Promise<{ response: string; images: string[] }> {
  let response = result.result;
  console.log("Processing Response: ",response);
  let images: string[] = [];
  
  const imagePathRegex = /\/Users\/[^\s]+\.(png|jpg|jpeg|svg)/g;
  const matches = response.match(imagePathRegex);
  
  if (matches) {
    images = matches.map(path => path.split('/').pop()!);
    matches.forEach(path => {
      response = response.replace(path, '').trim();
    });

    try {
      // Fix: Properly type the content array
      const content: ChatContent[] = [
        { 
          type: "text", 
          text: `Analyze these visualizations created for the query: "${query}". Results: "${response}" Describe what they show and provide insights from the data.` 
        }
      ];

      for (const imagePath of matches) {
        const { base64, mimeType } = await encodeImage(imagePath);
        content.push({
          type: "image_url",
          image_url: {
            url: `data:${mimeType};base64,${base64}`
          }
        });
      }

      const FinalResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content // Now properly typed
          },
        ],
      });

      return { 
        response: FinalResponse.choices[0]?.message?.content || '',
        images 
      };
    } catch (error) {
      console.error('Error processing images:', error);
      return processTextOnlyResult(response, query);
    }
  }

  return processTextOnlyResult(response, query);
}

async function processTextOnlyResult(response: string, query: string): Promise<{ response: string; images: string[] }> {
  // Fix: Properly type the content array
  console.log("text only");
  const content: ChatContent[] = [
    { 
      type: "text", 
      text: `User Query: ${query}\n\nAnalysis Result: ${response}. Please provide a clear and detailed explanation of these results. If there was an error response written in the analysis,just tell the user there was some error while processing data, do not explain the error and suggest some other question to ask. do not give any code` 
    }
  ];

  const FinalResponse = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content
      },
    ],
  });

  return { 
    response: FinalResponse.choices[0]?.message?.content || '',
    images: [] 
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as ChatRequest;
    const { messages, datasets } = body;

    const validMessages = messages
      .filter(msg => msg && msg.role && msg.content)
      .map(msg => ({
        role: msg.role,
        content: msg.content
      }));

    const Messages = [
      {
        role: 'system' as const,
        content: `You are an AI assistant that can engage in general conversation and perform data analysis. 
        If the user's query explicitly requires dataset analysis, calculations, or visualizations, use the analyze_data tool. 
        Otherwise, respond conversationally without using the tool. Only use the tool when necessary for data processing.`
      },
      ...validMessages.slice(0, -1),
      {
        role: 'user' as const,
        content: `Available datasets: ${datasets.map(d => d.title).join(', ')}. 
        Dataset URLs: ${datasets.map(d => d.url).join(', ')}. 
        User Query: ${validMessages[validMessages.length - 1].content}`
      }
    ];

    const toolCallResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: Messages,
      tools: [analysisTool],
      tool_choice: "auto",
    });

    const toolCall = toolCallResponse.choices[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      return NextResponse.json({
        response: toolCallResponse.choices[0]?.message?.content || 'No response generated',
        images: []
      });
    }

   

    const args = JSON.parse(toolCall.function.arguments);
    console.log(args.urls);
    console.log(args.query);
    const analysisResult = await analyze_data(args.urls, args.query);
    const { response, images } = await processAnalysisResult(analysisResult, args.query);

    console.log(response);
    console.log(images);
    
    return NextResponse.json({ response, images });

  } catch (error) {
    console.error('Error in chat endpoint:', error);
    
    let errorMessage = 'An unexpected error occurred';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Unable to connect to the analysis server';
        statusCode = 503;
      } else if (error.message.includes('Error from analysis server')) {
        errorMessage = error.message;
        statusCode = 400;
      }
    }

    return NextResponse.json(
      { 
        response: errorMessage,
        images: [],
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: statusCode }
    );
  }
}