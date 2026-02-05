const { test, expect } = require('@playwright/test');
const { allure } = require('allure-playwright');
const fs = require('fs');
const path = require('path');

test.describe('Страница входа на сайт', () => {

    test('ID: IN_ERR01 - Вывод ошибки при не верном введени данных', async ({ page }) => {
        await allure.story('Ввод данных');
        await allure.severity('critical');

        await allure.step('1. Переходим на сайт', async () => {
            await page.goto('https://calc.hr-rt.ru/identity/login?next=/');
            await expect(page).toHaveTitle(/AICalc - Войти/);
        });
        
        const EmailField = page.getByLabel('Электронная почта', { exact: false });
        const PasswordField = page.getByLabel('Пароль', { exact: false });
        const Button = page.getByRole('button', { name: 'Войти' });

        await allure.step('2. Проверяем состояние полей для ввода данных', async () => {
            
            await expect(EmailField).toBeVisible();

            await expect(PasswordField).toBeVisible();

            await expect(Button).toBeVisible();

            await allure.attachment('Начальная страница входа', 
            await page.screenshot(), 'image/png');
        });

        const fakeEmail = `wrong${Date.now()}@test.com`;
        const fakePassword = Math.random().toString(36).slice(2, 10);

        const maxAttempts = 6; 
        let attempts = 0;
        let ErrorPage = false;

        await allure.step('3. Проводим тестирование', async () => { 
        
            while (attempts < maxAttempts && !ErrorPage) {
                
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

                const errorMessage = page.locator('text=Учетная запись заблокирована');

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
                const errorMessage = page.locator('text=Учетная запись заблокирована');
                await expect(errorMessage).toBeVisible();
            
                await expect(EmailField).not.toBeVisible();
                await expect(PasswordField).not.toBeVisible();
                await expect(Button).not.toBeVisible();
            } else {
                console.log('❌ Тест не пройден: аккаунт не заблокирован');
                console.log(`Аккаунт НЕ заблокирован после ${maxAttempts-1} попыток`);
                throw new Error(`❌ ТЕСТ ПРОВАЛЕН: Аккаунт должен был заблокироваться после ${maxAttempts-1} попыток неверного входа.`);
            }

        });
    });
});