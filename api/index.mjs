import { createApplication } from '../dist/app.js';

let application;

async function initialize() {
  const app = await createApplication();
  try {
    await app.init();
    return app.getHttpAdapter().getInstance();
  } catch (error) {
    await app.close();
    throw error;
  }
}

export default async function handler(request, response) {
  application ??= initialize().catch((error) => {
    application = undefined;
    throw error;
  });
  const express = await application;
  express(request, response);
}
