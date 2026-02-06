const { defineConfig, devices } = require('@playwright/test');
require('dotenv').config();

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  
  // Репортеры
  reporter: [
    ['list'],  // Вывод в консоль
    ['html', { outputFolder: 'playwright-report' }],
    ['allure-playwright']  // Allure репортер
  ],
  
  use: {

    baseURL: process.env.BASE_URL || 'https://calc.hr-rt.ru',
    
    // Скриншоты при падении
    screenshot: 'only-on-failure',
    
    // Trace для отладки (можно открыть через npx playwright show-trace)
    trace: 'retain-on-failure',
  },
  
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Можно раскомментировать для тестирования в других браузерах
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],
});