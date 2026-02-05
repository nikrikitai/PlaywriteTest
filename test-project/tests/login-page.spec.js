const { test, expect } = require('@playwright/test');
const { allure } = require('allure-playwright');
const fs = require('fs');
const path = require('path');

test.describe('Страница входа на сайт', () => {

    test('ID: IN_ERR01 - Вывод ошибки при не верном введени данных', async ({ page }) => {
        await allure.story('Ввод данных');
        await allure.severity('critical');
        await page.goto('https://calc.hr-rt.ru/identity/login?next=/');

        await expect(page).toHaveTitle(/AICalc - Войти/);
        
        


    });
});