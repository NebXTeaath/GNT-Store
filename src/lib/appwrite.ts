// src/lib/appwrite.ts
import { Client, Account, Databases, Functions } from 'appwrite';

// Load configuration from environment variables using Vite's import.meta.env.
const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;
const APPWRITE_DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;

const client = new Client();

// Set endpoint and project ID from the .env file.
client
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

// Initialize the Account module for authentication.
const account = new Account(client);

// Initialize the Databases module.
const databases = new Databases(client);

// Initialize the Functions module.
const functions = new Functions(client);


export { client, account, databases, functions, APPWRITE_DATABASE_ID, APPWRITE_PROJECT_ID };
