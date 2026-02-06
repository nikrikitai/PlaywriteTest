const { test, expect } = require('@playwright/test');
const { allure } = require('allure-playwright');
const fs = require('fs');
const path = require('path');

const CONFIG = {

    // URL и попытки
    LOGIN_URL_CONFIG: process.env.LOGIN_PAGE_URL,
    MAX_ATTEMPTS_CONFIG: parseInt(process.env.MAX_LOGIN_ATTEMPTS),

    // Локаторы
    PAGE_TITLE_REGEX_CONFIG: process.env.PAGE_TITLE_REGEX,
    EMAIL_LABEL_CONFIG: process.env.EMAIL_LABEL,
    PASSWORD_LABEL_CONFIG: process.env.PASSWORD_LABEL,
    BUTTON_TEXT_CONFIG: process.env.BUTTON_TEXT,
    ERROR_MESSAGE_TEXT_CONFIG: process.env.ERROR_MESSAGE_TEXT

};

const REQUIRED_ENV_VARS = [

  'LOGIN_PAGE_URL',
  'MAX_LOGIN_ATTEMPTS',
  'PAGE_TITLE_REGEX',
  'EMAIL_LABEL', 
  'PASSWORD_LABEL',
  'BUTTON_TEXT',
  'ERROR_MESSAGE_TEXT'

];

test.describe('Страница входа на сайт', () => {

    test('ID: IN_ERR01 - Вывод ошибки при не верном введени данных', async ({ page }) => {
        await allure.story('Ввод данных');
        await allure.severity('critical');

        await allure.step('1. Проверка данных окружения', async () => {
            
            const missingVars = REQUIRED_ENV_VARS.filter(varName => !process.env[varName]);
            
            if (missingVars.length > 0) {
                throw new Error(`
                    ❌ Не заданы обязательные переменные окружения: ${missingVars.join(', ')}
        
                    Создайте файл .env со следующими переменными:
                    LOGIN_PAGE_URL=https://ваш-сервер/путь
                    MAX_LOGIN_ATTEMPTS=5
                    PAGE_TITLE_REGEX=AICalc - Войти
                    EMAIL_LABEL=Электронная почта
                    PASSWORD_LABEL=Пароль  
                    BUTTON_TEXT=Войти
                    ERROR_MESSAGE_TEXT=Учетная запись заблокирована
        
                    Или задайте их при запуске:
                    LOGIN_PAGE_URL=... MAX_LOGIN_ATTEMPTS=... npm test
                `);
            }

             // Дополнительная проверка числового значения
            const maxAttempts = parseInt(CONFIG.MAX_ATTEMPTS_CONFIG);
            if (isNaN(maxAttempts) || maxAttempts <= 0) {
                throw new Error(`❌ MAX_LOGIN_ATTEMPTS должно быть положительным числом`);
            }

        });

        await allure.step('2. Переходим на сайт', async () => {

            const titleRegex = new RegExp(CONFIG.PAGE_TITLE_REGEX_CONFIG);

            console.log(`URL: ${CONFIG.LOGIN_URL_CONFIG}`);
            console.log(`Макс. попыток: ${CONFIG.MAX_ATTEMPTS_CONFIG}`);
            console.log(`Заголовок (регекс): ${CONFIG.PAGE_TITLE_REGEX_CONFIG}`);

            await page.goto(CONFIG.LOGIN_URL_CONFIG);
            await expect(page).toHaveTitle(titleRegex);
        });
        
        const EmailField = page.getByLabel(CONFIG.EMAIL_LABEL_CONFIG, { exact: false });
        const PasswordField = page.getByLabel(CONFIG.PASSWORD_LABEL_CONFIG, { exact: false });
        const Button = page.getByRole('button', { name: CONFIG.BUTTON_TEXT_CONFIG });

        await allure.step('3. Проверяем состояние полей для ввода данных', async () => {
            
            await expect(EmailField).toBeVisible();

            await expect(PasswordField).toBeVisible();

            await expect(Button).toBeVisible();

            await allure.attachment('Начальная страница входа', 
            await page.screenshot(), 'image/png');
        });

        const fakeEmail = `wrong${Date.now()}@test.com`;
        const fakePassword = Math.random().toString(36).slice(2, 10);

        let attempts = 0;
        let ErrorPage = false;

        await allure.step('4. Проводим тестирование', async () => { 
        
            while (attempts < CONFIG.MAX_ATTEMPTS_CONFIG && !ErrorPage) {
                
                const emailValue = await EmailField.inputValue();
                const passwordValue = await PasswordField.inputValue();

                if (emailValue.trim() !== '' || passwordValue.trim() !== '') {    
                    await EmailField.clear();
                    await PasswordField.clear();
                }

                await EmailField.fill(fakeEmail);
                await PasswordField.fill(fakePassword);
                await Button.click();

                await page.waitForTimeout(1000);

                if(attempts == 0){
                    await allure.attachment('Пароль или логин введен не верно', 
                    await page.screenshot(), 'image/png');
                }

                const errorMessage = page.locator(`text=${CONFIG.ERROR_MESSAGE_TEXT_CONFIG}`);

                const isErrorMessageVisible = await errorMessage.isVisible().catch(() => false);

                const isEmailFieldVisible = await EmailField.isVisible().catch(() => false);
                const isPasswordFieldVisible = await PasswordField.isVisible().catch(() => false);
                const isLoginButtonVisible = await Button.isVisible().catch(() => false);

                if (isErrorMessageVisible || !isEmailFieldVisible || !isPasswordFieldVisible || !isLoginButtonVisible) {
                    ErrorPage = true;
                    console.log('✅ Тест пройден: аккаунт успешно заблокирован');
                    console.log(`Аккаунт заблокирован после ${attempts + 1} попыток`);
                    await allure.attachment('Финальное состояние страницы', 
                    await page.screenshot(), 'image/png');
                }

                attempts++;

            }

            if (ErrorPage) {
                const errorMessage = page.locator(`text=${CONFIG.ERROR_MESSAGE_TEXT_CONFIG}`);
                await expect(errorMessage).toBeVisible();
            
                await expect(EmailField).not.toBeVisible();
                await expect(PasswordField).not.toBeVisible();
                await expect(Button).not.toBeVisible();
            } else {
                console.log('❌ Тест не пройден: аккаунт не заблокирован');
                console.log(`Аккаунт НЕ заблокирован после ${CONFIG.MAX_ATTEMPTS_CONFIG} попыток`);
                throw new Error(`❌ ТЕСТ ПРОВАЛЕН: Аккаунт должен был заблокироваться после ${CONFIG.MAX_ATTEMPTS_CONFIG} попыток неверного входа.`);
            }

        });
    });
});