const { test, expect } = require('@playwright/test');
const { allure } = require('allure-playwright');
const fs = require('fs');
const path = require('path');

const CONFIG = {

    // URL и попытки
    BASE_URL_CONFIG: process.env.BASE_URL,
    LOGIN_ENDPOINT_CONFIG: process.env.LOGIN_ENDPOINT,
    FULL_LOGIN_URL_CONFIG: null,
    MAX_ATTEMPTS_CONFIG: parseInt(process.env.MAX_LOGIN_ATTEMPTS),

    // Локаторы
    PAGE_TITLE_REGEX_CONFIG: process.env.PAGE_TITLE_REGEX,
    PAGE_TITLE_MAIN_CONFIG: process.env.PAGE_TITLE_MAIN,
    EMAIL_LABEL_CONFIG: process.env.EMAIL_LABEL,
    PASSWORD_LABEL_CONFIG: process.env.PASSWORD_LABEL,
    BUTTON_TEXT_CONFIG: process.env.BUTTON_TEXT,
    ERROR_MESSAGE_TEXT_CONFIG: process.env.ERROR_MESSAGE_TEXT,

    //Данные для входа в систему
    USER_LOGIN_CONFIG: process.env.USER_LOGIN,
    USER_PASSWORD_CONFIG: process.env.USER_PASSWORD

};



async function validateEnvVars(requiredVars, testName) {
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
        throw new Error(`
            ❌ Тест "${testName}" не может быть выполнен
            Отсутствуют переменные: ${missingVars.join(', ')}
            
            Добавьте в .env:
            ${missingVars.map(v => `${v}=значение`).join('\n            ')}
        `);
    }

    if (!CONFIG.BASE_URL_CONFIG.startsWith('http')) {
        throw new Error(`❌ BASE_URL должен начинаться с http:// или https://`);
    }

    if (!CONFIG.LOGIN_ENDPOINT_CONFIG.startsWith('/')) {
        throw new Error(`❌ LOGIN_ENDPOINT должен начинаться с /`);
    }

    if (CONFIG.BASE_URL_CONFIG && CONFIG.LOGIN_ENDPOINT_CONFIG && !CONFIG.FULL_LOGIN_URL_CONFIG) {
    CONFIG.FULL_LOGIN_URL_CONFIG = `${CONFIG.BASE_URL_CONFIG}${CONFIG.LOGIN_ENDPOINT_CONFIG}`;
    }

}

async function navigateToLogin(page) {
    const titleRegex = new RegExp(CONFIG.PAGE_TITLE_REGEX_CONFIG);

    console.log(`Базовый URL: ${CONFIG.BASE_URL_CONFIG}`);
    console.log(`Эндпоинт входа: ${CONFIG.LOGIN_ENDPOINT_CONFIG}`);
    console.log(`Полный URL: ${CONFIG.FULL_LOGIN_URL_CONFIG}`);
    console.log(`Заголовок (регекс): ${CONFIG.PAGE_TITLE_REGEX_CONFIG}`);

    await page.goto(CONFIG.FULL_LOGIN_URL_CONFIG);
    await expect(page).toHaveTitle(titleRegex);


}

async function getLoginElements(page) {
    const EmailField = page.getByLabel(CONFIG.EMAIL_LABEL_CONFIG, { exact: false });
    const PasswordField = page.getByLabel(CONFIG.PASSWORD_LABEL_CONFIG, { exact: false });
    const Button = page.getByRole('button', { name: CONFIG.BUTTON_TEXT_CONFIG });
    return { EmailField, PasswordField, Button };
}


async function verifyLoginForm(page) {
    return await allure.step('Проверка формы входа', async () => {
        const elements = await getLoginElements(page);
        await expect(elements.EmailField).toBeVisible();
        await expect(elements.PasswordField).toBeVisible();
        await expect(elements.Button).toBeVisible();
        return elements;
    });
}

async function clearCookiesAndStorage(page) {
    await allure.step('Очистка cookies и localStorage', async () => {
        await page.context().clearCookies();
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        console.log('✅ Cookies и хранилища очищены');
    });
}

test.describe('Страница входа на сайт', () => {

    test('ID: LOGIN01 - Проверка входа в систему по валидным данным', async ({ page }) => {
        await allure.story('Успешная авторизация');
        await allure.severity('critical');

        const VALID_ENV_VARS_LOGIN = [

            'BASE_URL',
            'LOGIN_ENDPOINT',
            'PAGE_TITLE_REGEX',
            'PAGE_TITLE_MAIN',
            'EMAIL_LABEL', 
            'PASSWORD_LABEL',
            'BUTTON_TEXT',
            'USER_LOGIN',
            'USER_PASSWORD'

        ];

        await allure.step('1. Проверка данных окружения', async () => {
            await validateEnvVars(VALID_ENV_VARS_LOGIN, 'LOGIN01');
        });

        await allure.step('2. Переходим на сайт', async () => {
            await navigateToLogin(page);
        });

        let EmailField, PasswordField, Button;

        await allure.step('3. Проверяем состояние полей для ввода данных', async () => {
            
            const elements = await verifyLoginForm(page);
            EmailField = elements.EmailField;
            PasswordField = elements.PasswordField;
            Button = elements.Button;

            await allure.attachment('Начальная страница входа', 
            await page.screenshot(), 'image/png');

        });

        await allure.step('4. Проверка успешной авторизации', async () => {

            await EmailField.fill(CONFIG.USER_LOGIN_CONFIG);
            await PasswordField.fill(CONFIG.USER_PASSWORD_CONFIG);
            await Button.click();

            const titleMain = new RegExp(CONFIG.PAGE_TITLE_MAIN_CONFIG);
            
            await expect(page).not.toHaveURL(CONFIG.FULL_LOGIN_URL_CONFIG);
            await expect(page).toHaveTitle(titleMain);

            const cookies = await page.context().cookies();
            expect(cookies.length).toBeGreaterThan(0);
            console.log('✅ Вход выполнен успешно');
            await allure.attachment('После входа', await page.screenshot(), 'image/png');

        });


        await allure.step('5. Очистка cookies', async () => {
            await clearCookiesAndStorage(page);
        });

        await allure.step('6. Проверяем что разлогинились', async () => {
            await page.reload();
            await expect(page).toHaveURL(CONFIG.FULL_LOGIN_URL_CONFIG);
            console.log('✅ Куки очищены, страница вернулась к форме входа');
        });

    });

    test('ID: IN_ERR01 - Вывод ошибки при не верном введени данных', async ({ page }) => {
        await allure.story('Блокировка аккаунта');
        await allure.severity('critical');

        const VALID_ENV_VARS_LOGIN = [

            'BASE_URL',
            'LOGIN_ENDPOINT',
            'MAX_LOGIN_ATTEMPTS',
            'PAGE_TITLE_REGEX',
            'EMAIL_LABEL', 
            'PASSWORD_LABEL',
            'BUTTON_TEXT',
            'ERROR_MESSAGE_TEXT'
        ]; 

        await allure.step('1. Проверка данных окружения', async () => {
            
            await validateEnvVars(VALID_ENV_VARS_LOGIN, 'IN_ERR01');

             // Дополнительная проверка числового значения
            const maxAttempts = parseInt(CONFIG.MAX_ATTEMPTS_CONFIG);
            if (isNaN(maxAttempts) || maxAttempts <= 0) {
                throw new Error(`❌ MAX_LOGIN_ATTEMPTS должно быть положительным числом`);
            }

        });

        await allure.step('2. Переходим на сайт', async () => {
            await navigateToLogin(page);
        });

        let EmailField, PasswordField, Button;
        
        await allure.step('3. Проверяем состояние полей для ввода данных', async () => {
            
            const elements = await verifyLoginForm(page);
            EmailField = elements.EmailField;
            PasswordField = elements.PasswordField;
            Button = elements.Button;

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