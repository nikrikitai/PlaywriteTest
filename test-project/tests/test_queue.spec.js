const { test, expect } = require('@playwright/test');
const { allure } = require('allure-playwright');
const fs = require('fs');
const path = require('path');

const CONFIG = {

    // URL и попытки
    BASE_URL_CONFIG: process.env.BASE_URL,
    LOGIN_ENDPOINT_CONFIG: process.env.LOGIN_ENDPOINT,
    PAGE_ENDPOINT_CONFIG: process.env.PAGE_ENDPOINT,
    FULL_LOGIN_URL_CONFIG: null,
    FULL_PAGE_URL_CONFIG: null,
    TIMEOUT_ERROR_S_CONFIG: parseInt(process.env.TIMEOUT_ERROR_S),
    RATE_LIMIT_ATTEMPTS_CONFIG: parseInt(process.env.RATE_LIMIT_ATTEMPTS),

    // Локаторы
    PAGE_TITLE_REGEX_CONFIG: process.env.PAGE_TITLE_REGEX,
    PAGE_TITLE_MAIN_CONFIG: process.env.PAGE_TITLE_MAIN,
    PAGE_TEST_TITLE_CONFIG: process.env.PAGE_TEST_TITLE,
    EMAIL_LABEL_CONFIG: process.env.EMAIL_LABEL,
    PASSWORD_LABEL_CONFIG: process.env.PASSWORD_LABEL,
    BUTTON_IN_TEXT_CONFIG: process.env.BUTTON_TEXT,
    BUTTON_TO_PAGE_TEST_CONFIG: process.env.BUTTON_TO_PAGE_TEST,
    BUTTON_TEXT_TO_TEST01_CONFIG: process.env.BUTTON_TEXT_TO_TEST01,
    BUTTON_TEXT_TO_TEST02_CONFIG: process.env.BUTTON_TEXT_TO_TEST02,

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

    if (!CONFIG.PAGE_ENDPOINT_CONFIG.startsWith('/')) {
        throw new Error(`❌ PAGE_ENDPOINT должен начинаться с /`);
    }

    if (CONFIG.BASE_URL_CONFIG && CONFIG.LOGIN_ENDPOINT_CONFIG && !CONFIG.FULL_LOGIN_URL_CONFIG) {
    CONFIG.FULL_LOGIN_URL_CONFIG = `${CONFIG.BASE_URL_CONFIG}${CONFIG.LOGIN_ENDPOINT_CONFIG}`;
    }

    // Дополнительная проверка числового значения
    const timeout = parseInt(CONFIG.TIMEOUT_ERROR_S_CONFIG);
    if (isNaN(timeout) || timeout <= 0) {
        throw new Error(`❌ TIMEOUT_ERROR_S должно быть положительным числом`);
    }

    const attemps = parseInt(CONFIG.RATE_LIMIT_ATTEMPTS_CONFIG);
    if (isNaN(attemps) || attemps <= 0) {
        throw new Error(`❌ RATE_LIMIT_ATTEMPTS должно быть положительным числом`);
    }

    if (CONFIG.BASE_URL_CONFIG && CONFIG.PAGE_ENDPOINT_CONFIG && !CONFIG.FULL_PAGE_URL_CONFIG) {
        CONFIG.FULL_PAGE_URL_CONFIG = `${CONFIG.BASE_URL_CONFIG}${CONFIG.PAGE_ENDPOINT_CONFIG}`;
    }

    console.log(`URL проверяемой страницы: ${CONFIG.FULL_PAGE_URL_CONFIG}`);


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
    const Button = page.getByRole('button', { name: CONFIG.BUTTON_IN_TEXT_CONFIG });
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

async function login(requiredVars, page, testName){
    await allure.step('1. Проверка данных окружения', async () => {
            await validateEnvVars(requiredVars, testName);
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
}


test.describe('Тест сайта', () => {

     test('ID: RATE01 - Rate limiting на кнопке "Начать работу"', async ({ page }) => {
        
        await allure.story('Rate limiting');
        await allure.severity('critical');

        const VALID_ENV_VARS_RATE = [

            'BASE_URL',
            'LOGIN_ENDPOINT',
            'PAGE_ENDPOINT',
            'RATE_LIMIT_ATTEMPTS',
            'PAGE_TITLE_REGEX',
            'TIMEOUT_ERROR_S',
            'PAGE_TEST_TITLE',
            'PAGE_TITLE_MAIN',
            'EMAIL_LABEL', 
            'PASSWORD_LABEL',
            'BUTTON_TEXT',
            'BUTTON_TO_PAGE_TEST',
            'USER_LOGIN',
            'USER_PASSWORD'

        ];

        await allure.step('1. Вход на начальную страницу', async () => {
            await login(VALID_ENV_VARS_RATE, page,'RATE01');
        });


        let Button_test_page;

        await allure.step('2. Переход на тестируемую страницу', async () => {
            
            let isBlocked = true;
            const maxWait = 120000; 
            const start = Date.now();

            Button_test_page = page.locator(`a[href="${CONFIG.PAGE_ENDPOINT_CONFIG}"]`).first();
            await expect(Button_test_page).toBeVisible();

            while (isBlocked && Date.now() - start < maxWait) {
            const response = await page.goto(CONFIG.FULL_PAGE_URL_CONFIG).catch(() => null);
            if (response && response.status() !== 429) {
                isBlocked = false;
                console.log('✅ Ошибки 429 нет, страница загружена');
            } else {
                console.log('⏳ Ошибка 429 действует, ждём 2 сек...');
                await page.waitForTimeout(2000);
            }
            }

            if (isBlocked) {
                throw new Error('❌ Ошибка 429 не снялась даже после 2 минут ожидания');
            }


            const titleTestPage = new RegExp(CONFIG.PAGE_TEST_TITLE_CONFIG);
            await expect(page).toHaveTitle(titleTestPage);
            Button_test_page = page.locator(`a[href="${CONFIG.PAGE_ENDPOINT_CONFIG}"]`).first();
            await expect(Button_test_page).toBeVisible();

        });

        

        await allure.step('3. Вызываем ошибку и ждем восстановление после таймаута', async () => {
            
            let responseStatus = null;
            let errorResponse = null;
    
            
            page.on('response', response => {
                    if (response.status() === 403) {
                        responseStatus = response.status();
                        errorResponse = response;
                    }
                });


            for (let i = 0; i < CONFIG.RATE_LIMIT_ATTEMPTS_CONFIG; i++) {

                await Button_test_page.click({ delay: 50 });

                await page.waitForTimeout(1500);

                if (responseStatus === 403) {
                    
                    console.log(`✅ Rate limit сработал: ${responseStatus}`);
                    console.log(`🚫 403 ошибка получена после ${i + 1} кликов`);
                    
                    await allure.attachment('Страница после блокировки', 
                        await page.screenshot(), 'image/png');
            
                    break;
                }

            }

            if (responseStatus !== 403) {
                throw new Error(`❌ Rate limit не сработал! 403 ошибка не получена после ${CONFIG.RATE_LIMIT_ATTEMPTS_CONFIG} кликов`);
            }

            console.log(`⏳ Ожидание ${CONFIG.TIMEOUT_ERROR_S_CONFIG} секунд...`);
            await page.waitForTimeout(CONFIG.TIMEOUT_ERROR_S_CONFIG*1000);

            await page.reload();
            await expect(Button_test_page).toBeVisible();

            await Button_test_page.click();
            await expect(Button_test_page).toBeVisible();

            console.log('✅ Rate limit сброшен, кнопка работает');

        });
        
        await allure.step('4. Очистка cookies', async () => {
            await clearCookiesAndStorage(page);
        });

        let EmailField, PasswordField, Button;

        await allure.step('5. Проверяем что разлогинились', async () => {
            await page.goto(CONFIG.FULL_LOGIN_URL_CONFIG);
            const elements = await verifyLoginForm(page);
            EmailField = elements.EmailField;
            PasswordField = elements.PasswordField;
            Button = elements.Button;
            console.log('✅ Куки очищены, страница вернулась к форме входа');
        });   

    });

    test('ID: RATE02 - Rate limiting на кнопке "Открыть резюме"', async ({ page }) => {

        await allure.story('Rate limiting');
        await allure.severity('critical');

        const VALID_ENV_VARS_RATE = [

            'BASE_URL',
            'LOGIN_ENDPOINT',
            'PAGE_ENDPOINT',
            'RATE_LIMIT_ATTEMPTS',
            'PAGE_TITLE_REGEX',
            'TIMEOUT_ERROR_S',
            'PAGE_TEST_TITLE',
            'PAGE_TITLE_MAIN',
            'EMAIL_LABEL', 
            'PASSWORD_LABEL',
            'BUTTON_TEXT',
            'BUTTON_TO_PAGE_TEST',
            'BUTTON_TEXT_TO_TEST01',
            'USER_LOGIN',
            'USER_PASSWORD'

        ];

        await allure.step('1. Вход на начальную страницу', async () => {
            await login(VALID_ENV_VARS_RATE, page,'RATE02');
        });

        let EmailField, PasswordField, Button, Button_test_page, Button_test01;

        await allure.step('2. Переход на тестируемую страницу', async () => {
            let isBlocked = true;
            const maxWait = 120000; 
            const start = Date.now();

            Button_test_page = page.locator(`a[href="${CONFIG.PAGE_ENDPOINT_CONFIG}"]`).first();
            await expect(Button_test_page).toBeVisible();

            while (isBlocked && Date.now() - start < maxWait) {
            const response = await page.goto(CONFIG.FULL_PAGE_URL_CONFIG).catch(() => null);
            if (response && response.status() !== 429) {
                isBlocked = false;
                console.log('✅ Ошибки 429 нет, страница загружена');
            } else {
                console.log('⏳ Ошибка 429 действует, ждём 2 сек...');
                await page.waitForTimeout(2000);
            }
            }

            if (isBlocked) {
                throw new Error('❌ Ошибка 429 не снялась даже после 2 минут ожидания');
            }

            const titleTestPage = new RegExp(CONFIG.PAGE_TEST_TITLE_CONFIG);
            await expect(page).toHaveTitle(titleTestPage);

            Button_test01 = page.getByRole('button', { name: CONFIG.BUTTON_TEXT_TO_TEST01_CONFIG });;
            await expect(Button_test01).toBeVisible();

        });

         await allure.step('3. Вызываем ошибку и ждем восстановление после таймаута', async () => {
            
            let responseStatus = null;
            let errorResponse = null;
    
            
            page.on('response', response => {
                    if (response.status() === 403) {
                        responseStatus = response.status();
                        errorResponse = response;
                    }
                });


            for (let i = 0; i < CONFIG.RATE_LIMIT_ATTEMPTS_CONFIG; i++) {

                await Button_test01.click({ delay: 50 });

                await page.waitForTimeout(1500);

                if (responseStatus === 403) {
                    
                    console.log(`✅ Rate limit сработал: ${responseStatus}`);
                    console.log(`🚫 403 ошибка получена после ${i + 1} кликов`);
                    
                    await allure.attachment('Страница после блокировки', 
                        await page.screenshot(), 'image/png');
            
                    break;
                }

            }

            if (responseStatus !== 403) {
                throw new Error(`❌ Rate limit не сработал! 403 ошибка не получена после ${CONFIG.RATE_LIMIT_ATTEMPTS_CONFIG} кликов`);
            }

            console.log(`⏳ Ожидание ${CONFIG.TIMEOUT_ERROR_S_CONFIG} секунд...`);
            await page.waitForTimeout(CONFIG.TIMEOUT_ERROR_S_CONFIG*1000);

            await page.reload();
            await expect(Button_test_page).toBeVisible();
            await expect(Button_test01).toBeVisible();
            const titleTestPage = new RegExp(CONFIG.PAGE_TEST_TITLE_CONFIG);
            await expect(page).toHaveTitle(titleTestPage);

            await Button_test01.click();
            await expect(page).toHaveTitle(titleTestPage);

            console.log('✅ Rate limit сброшен, кнопка работает');

        });
        
        await allure.step('4. Очистка cookies', async () => {
            await clearCookiesAndStorage(page);
        });

        await allure.step('5. Проверяем что разлогинились', async () => {
            await page.goto(CONFIG.FULL_LOGIN_URL_CONFIG);
            const elements = await verifyLoginForm(page);
            EmailField = elements.EmailField;
            PasswordField = elements.PasswordField;
            Button = elements.Button;
            console.log('✅ Куки очищены, страница вернулась к форме входа');
        });

        
    });

    test('ID: RATE03 - Rate limiting на кнопке "Отклонить кандидата"', async ({ page }) => {

        await allure.story('Rate limiting');
        await allure.severity('critical');

        const VALID_ENV_VARS_RATE = [

            'BASE_URL',
            'LOGIN_ENDPOINT',
            'PAGE_ENDPOINT',
            'RATE_LIMIT_ATTEMPTS',
            'PAGE_TITLE_REGEX',
            'TIMEOUT_ERROR_S',
            'PAGE_TEST_TITLE',
            'PAGE_TITLE_MAIN',
            'EMAIL_LABEL', 
            'PASSWORD_LABEL',
            'BUTTON_TEXT',
            'BUTTON_TO_PAGE_TEST',
            'BUTTON_TEXT_TO_TEST02',
            'USER_LOGIN',
            'USER_PASSWORD'

        ];

        await allure.step('1. Вход на начальную страницу', async () => {
            await login(VALID_ENV_VARS_RATE, page,'RATE03');
        });

        let EmailField, PasswordField, Button, Button_test_page, Button_test02;

        await allure.step('2. Переход на тестируемую страницу', async () => {
            let isBlocked = true;
            const maxWait = 120000; 
            const start = Date.now();

            Button_test_page = page.locator(`a[href="${CONFIG.PAGE_ENDPOINT_CONFIG}"]`).first();
            await expect(Button_test_page).toBeVisible();

            while (isBlocked && Date.now() - start < maxWait) {
            const response = await page.goto(CONFIG.FULL_PAGE_URL_CONFIG).catch(() => null);
            if (response && response.status() !== 429) {
                isBlocked = false;
                console.log('✅ Ошибки 429 нет, страница загружена');
            } else {
                console.log('⏳ Ошибка 429 действует, ждём 2 сек...');
                await page.waitForTimeout(2000);
            }
            }

            if (isBlocked) {
                throw new Error('❌ Ошибка 429 не снялась даже после 2 минут ожидания');
            }

            const titleTestPage = new RegExp(CONFIG.PAGE_TEST_TITLE_CONFIG);
            await expect(page).toHaveTitle(titleTestPage);

            Button_test02 = page.getByRole('button', { name: CONFIG.BUTTON_TEXT_TO_TEST02_CONFIG });;
            await expect(Button_test02).toBeVisible();

        });

         await allure.step('3. Вызываем ошибку и ждем восстановление после таймаута', async () => {
            
            let responseStatus = null;
            let errorResponse = null;
    
            
            page.on('response', response => {
                    if (response.status() === 403) {
                        responseStatus = response.status();
                        errorResponse = response;
                    }
                });


            for (let i = 0; i < CONFIG.RATE_LIMIT_ATTEMPTS_CONFIG; i++) {

                await Button_test02.click({ delay: 50 });

                await page.waitForTimeout(1500);

                if (responseStatus === 403) {
                    
                    console.log(`✅ Rate limit сработал: ${responseStatus}`);
                    console.log(`🚫 403 ошибка получена после ${i + 1} кликов`);
                    
                    await allure.attachment('Страница после блокировки', 
                        await page.screenshot(), 'image/png');
            
                    break;
                }

            }

            if (responseStatus !== 403) {
                throw new Error(`❌ Rate limit не сработал! 403 ошибка не получена после ${CONFIG.RATE_LIMIT_ATTEMPTS_CONFIG} кликов`);
            }

            console.log(`⏳ Ожидание ${CONFIG.TIMEOUT_ERROR_S_CONFIG} секунд...`);
            await page.waitForTimeout(CONFIG.TIMEOUT_ERROR_S_CONFIG*1000);

            await page.reload();
            await expect(Button_test_page).toBeVisible();
            await expect(Button_test02).toBeVisible();
            const titleTestPage = new RegExp(CONFIG.PAGE_TEST_TITLE_CONFIG);
            await expect(page).toHaveTitle(titleTestPage);

            await Button_test02.click();
            await expect(page).toHaveTitle(titleTestPage);

            console.log('✅ Rate limit сброшен, кнопка работает');

        });
        
        await allure.step('4. Очистка cookies', async () => {
            await clearCookiesAndStorage(page);
        });

        await allure.step('5. Проверяем что разлогинились', async () => {
            await page.goto(CONFIG.FULL_LOGIN_URL_CONFIG);
            const elements = await verifyLoginForm(page);
            EmailField = elements.EmailField;
            PasswordField = elements.PasswordField;
            Button = elements.Button;
            console.log('✅ Куки очищены, страница вернулась к форме входа');
        });

        
    });

});