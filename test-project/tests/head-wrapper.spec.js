const { test, expect } = require('@playwright/test');
const { allure } = require('allure-playwright');
const fs = require('fs');
const path = require('path');

async function testDropdownMenu(page, testData, stepName) {
  
  await allure.step(stepName, async () => {
      const gasificationMenu = page.locator(testData.selector);
      await expect(gasificationMenu).toContainText(testData.expectedText);
      const dropdownMenu = page.locator(testData.dropMenulocator);
      const dataTarget = await gasificationMenu.getAttribute('data-target');

      const isHidden = await dropdownMenu.isHidden();
      if (!isHidden) {
        const display = await dropdownMenu.evaluate(el => window.getComputedStyle(el).display);
        if (display !== 'none') {
          const opacity = await dropdownMenu.evaluate(el => window.getComputedStyle(el).opacity);
          expect(parseFloat(opacity)).toBeLessThan(0.1);
        }
      }

      await gasificationMenu.click();
      await page.waitForTimeout(500);
      await expect(dropdownMenu).toBeVisible();
      
      await expect(dropdownMenu).toHaveClass(/active/);
      
      const specificDropdownMenu = page.locator(`#${dataTarget}`);
      await expect(specificDropdownMenu).toBeVisible();

      const menuTitle = specificDropdownMenu.locator('.head-second__inner');
      await expect(menuTitle).toBeVisible();
      await expect(menuTitle).toContainText(testData.expectedMenuTitle);

      const gasmenuScreenshot = await takePageScreenshot(page, testData.screenshotName);
      
      const closeButton = specificDropdownMenu.locator('.head-second-menu-close');
      await expect(closeButton).toBeVisible();

      await closeButton.click({ force: true });
      await page.waitForTimeout(300);
      
      await expect(dropdownMenu).not.toBeVisible();

  });

  
}

async function takePageScreenshot(page, pageName) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const screenshotName = `${pageName}_${timestamp}.png`;
  
  // Делаем скриншот полной страницы
  const screenshot = await page.screenshot({ fullPage: true });
  
  // Добавляем в Allure отчет
  await allure.attachment(screenshotName, screenshot, 'image/png');
  
  // Сохраняем локально для архива
  const screenshotsDir = path.join(__dirname, '../screenshots/page-transitions');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
  
  const filePath = path.join(screenshotsDir, screenshotName);
  fs.writeFileSync(filePath, screenshot);
  console.log(`Скриншот сохранен: ${filePath}`);
  
  return screenshotName;
}


test.describe('Верхняя часть сайта Мособлгаз', () => {
  
  test.beforeEach(async ({ page }) => {    
    await allure.epic('Мособлгаз - Верхняя часть сайта');
    await allure.feature('Десктопная версия');
  });

  //ЛОГОТИП
  test('ID: LOGO_01 - Логотип компании', async ({ page }) => {
    await allure.story('Логотип');
    await allure.severity('critical');
    await page.goto('https://mosoblgaz.ru/');  
    
    const logoContainer = page.locator('.head-top__logo');
    const logoLink = page.locator('.head-top__logo-link');
    const logoImage = logoLink.locator('img');
    
    await allure.step('1. Контейнер логотипа виден', async () => {
      await expect(logoContainer).toBeVisible();
    });
    
    await allure.step('2. Ссылка логотипа доступна', async () => {
      await expect(logoLink).toBeVisible();
      await expect(logoLink).toHaveAttribute('href', '/');
      await expect(logoLink).toHaveCSS('cursor', 'pointer');
    });
    
    await allure.step('3. Изображение логотипа', async () => {
      await expect(logoImage).toBeVisible();
      await allure.attachment('Логотип', await logoImage.screenshot(), 'image/png');
    });
    
    await allure.step('4. Клик ведет на главную страницу', async () => {
      await logoLink.click();
      await expect(page).toHaveURL(/https:\/\/mosoblgaz\.ru\/?$/);
       await allure.attachment('Скриншот главной страницы', await page.screenshot(), 'image/png')
    });
  });

  //ПРАВАЯ ЧАСТЬ ШАПКИ
  test('ID: HEADER_RIGHT_01 - Правая часть шапки', async ({ page }) => {
    await allure.story('Правая панель навигации');
    await allure.severity('high');
    await page.goto('https://mosoblgaz.ru/');  
    
    const headerRight = page.locator('.head-top__right');
    
    await allure.step('1. Контейнер правой части виден', async () => {
      await expect(headerRight).toBeVisible();
      await expect(headerRight).toHaveCSS('display', 'flex');
    });
    
    await allure.step('2. Интернет-магазин', async () => {
      const shopLink = page.locator('a.header-top__im.tablet-hide');
      await expect(shopLink).toBeVisible();
      await expect(shopLink).toHaveAttribute('href', 'https://shop.mosoblgaz.ru/');
      await expect(shopLink).toHaveAttribute('target', '_blank');
      await expect(shopLink).toContainText('Интернет-магазин');
      
      const shopIcon = shopLink.locator('img');
      await expect(shopIcon).toBeVisible();
      await expect(shopIcon).toHaveAttribute('alt', 'Интернет-магазин');
      await expect(shopIcon).toHaveAttribute('src', /header-im-link-2\.svg$/);
      
    });
    
    await allure.step('3. Ссылка на телефон', async () => {
      const phoneLink = page.locator('a.head-top__phone-link');
      await expect(phoneLink).toBeVisible();
      
      const href = await phoneLink.getAttribute('href');
      expect(href).toBe('tel:112');

    });
    
    await allure.step('4. Контакты', async () => {
      const contactsLink = page.locator('a.head-top__right-link.tablet-hide[href="/contacts"]');
      await expect(contactsLink).toBeVisible();
      await expect(contactsLink).toContainText('Контакты');
      await expect(contactsLink).toHaveAttribute('href', '/contacts');
      
    });
    
    // Переключение языка
    await allure.step('5. Переход на английскую версию сайта', async () => {
      const langLink = page.locator('a.head-top__right-link[href="/en"]');
      await expect(langLink).toBeVisible();
      await expect(langLink).toContainText('EN');
      await expect(langLink).toHaveAttribute('href', '/en');
    });
  });

  //КНОПКИ ДЕЙСТВИЙ
  test('ID: ACTION_BUTTONS_01 - Основные кнопки действий', async ({ page }) => {
    await allure.story('Кнопки основных действий');
    await allure.severity('critical');
     await page.goto('https://mosoblgaz.ru/');  

    const buttonsContainer = page.locator('.head-top__buttons');
    
    await allure.step('1. Контейнер кнопок виден и имеет flex-расположение', async () => {
      await expect(buttonsContainer).toBeVisible();
      await expect(buttonsContainer).toHaveCSS('display', 'flex');
    });
    
    await allure.step('2. Кнопка "Подключить газ"', async () => {
      const gasButton = page.locator('a.head-top__button[href="/connection/"]');
      await expect(gasButton).toBeVisible();
      await expect(gasButton).toContainText('Подключить газ');
      await expect(gasButton).toHaveClass(/head-top__button button button--icon hearth lightBlue/);
      
    });
    
    await allure.step('3. Кнопка "Техническое обслуживание"', async () => {
      const serviceButton = page.locator('a.head-top__button[href*="tekhnicheskoe-obsluzhivanie"]');
      await expect(serviceButton).toBeVisible();
      await expect(serviceButton).toContainText('Техническое обслуживание');
      await expect(serviceButton).toHaveClass(/head-top__button button button--icon orange tech_service_main/);
      
    });
    
    await allure.step('4. Кнопка "Юридическим лицам"', async () => {
      const businessButton = page.locator('a.head-top__button[href="/business/"]');
      await expect(businessButton).toBeVisible();
      await expect(businessButton).toContainText('Юридическим лицам');
      await expect(businessButton).toHaveClass(/head-top__button button darkBlue head-business-btn/);
      
    });
    
  });

  //ФУНКЦИОНАЛЬНОСТЬ ПЕРЕХОДОВ
  test('ID: NAVIGATION_01 - Проверка переходов по ссылкам', async ({ page, context }) => {
    await allure.story('Навигация по сайту');
    await allure.severity('high');
    await page.goto('https://mosoblgaz.ru/');  

    let newPage;
    
    await allure.step('1. Интернет-магазин открывается в новой вкладке', async () => {
      const shopLink = page.locator('a.header-top__im.tablet-hide');
      
      [newPage] = await Promise.all([
        context.waitForEvent('page'),
        shopLink.click()
      ]);
      
      await newPage.waitForLoadState('load');
      await expect(newPage).toHaveURL(/shop\.mosoblgaz\.ru/);
      const shopScreenshot = await takePageScreenshot(newPage, 'internet-magazin-page');
      allure.parameter('Скриншот интернет-магазина', shopScreenshot);
      await newPage.close();
    });
    
    await allure.step('2. Переход в раздел "Подключить газ"', async () => {
      const gasButton = page.locator('a.head-top__button[href="/connection/"]');
      await gasButton.click();
      await expect(page).toHaveURL(/\/connection\/?/);
      
      const pageTitle = await page.title();
      expect(pageTitle).toBeTruthy();

      const gasScreenshot = await takePageScreenshot(page, 'connection-gas-page');
      allure.parameter('Скриншот страницы "Подключить газ"', gasScreenshot);
      
      await page.goBack();
      await page.waitForURL('https://mosoblgaz.ru/');
    });
    
    await allure.step('3. Переход в раздел "Техническое обслуживание"', async () => {
      const serviceButton = page.locator('a.head-top__button[href*="tekhnicheskoe-obsluzhivanie"]');
      await serviceButton.click();
      await expect(page).toHaveURL(/tekhnicheskoe-obsluzhivanie/);

      const serviceScreenshot = await takePageScreenshot(page, 'tech-service-page');
      allure.parameter('Скриншот страницы ТО', serviceScreenshot);

      await page.goBack();
    });
    
    await allure.step('4. Переход в раздел "Юридическим лицам"', async () => {
      const businessButton = page.locator('a.head-top__button[href="/business/"]');
      await businessButton.click();
      await expect(page).toHaveURL(/\/business\/?/);

      const businessScreenshot = await takePageScreenshot(page, 'business-page');
      allure.parameter('Скриншот страницы для юрлиц', businessScreenshot);

      await page.goBack();
    });
    
    await allure.step('5. Переход в раздел "Контакты"', async () => {
      const contactsLink = page.locator('a.head-top__right-link.tablet-hide[href="/contacts"]');
      await contactsLink.click();
      await expect(page).toHaveURL(/\/contacts\/?/);

      const contactsScreenshot = await takePageScreenshot(page, 'contacts-page');
      allure.parameter('Скриншот страницы контактов', contactsScreenshot);

      await page.goBack();
    });
    
    await allure.step('6. Переход на английскую версию', async () => {
      const langLink = page.locator('a.head-top__right-link[href="/en"]');
      await langLink.click();
      await expect(page).toHaveURL(/\/en\/?/);
      
      const englishScreenshot = await takePageScreenshot(page, 'english-version-page');
      allure.parameter('Скриншот английской версии', englishScreenshot);
      
      await page.goBack();
    });
  });

  //ВИЗУАЛЬНАЯ ЦЕЛОСТНОСТЬ
  test('ID: VISUAL_01 - Визуальная проверка верхней части', async ({ page }) => {
    await allure.story('Визуальное оформление');
    await allure.severity('medium');
    await page.goto('https://mosoblgaz.ru/');

    await allure.step('1. Делаем полный скриншот верхней части', async () => {
      const header = page.locator('header').first() || 
                    page.locator('.header').first() ||
                    page.locator('body > div:first-child');
      
      await expect(header).toBeVisible();
      
      const screenshot = await header.screenshot();
      await allure.attachment('Верхняя часть сайта (полная)', screenshot, 'image/png');
      
      const fs = require('fs');
      const path = require('path');
      const screenshotsDir = path.join(__dirname, '../screenshots');
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }
      fs.writeFileSync(
        path.join(screenshotsDir, 'mosoblgaz-header-desktop.png'),
        screenshot
      );
    });
    
    await allure.step('2. Проверяем выравнивание элементов', async () => {
      const elements = [
        { name: 'Логотип', selector: '.head-top__logo' },
        { name: 'Правая панель', selector: '.head-top_right' },
        { name: 'Кнопки действий', selector: '.head-top__buttons' }
      ];
      
      for (let i = 0; i < elements.length; i++) {
        for (let j = i + 1; j < elements.length; j++) {
          const elem1 = page.locator(elements[i].selector);
          const elem2 = page.locator(elements[j].selector);
          
          if (await elem1.count() > 0 && await elem2.count() > 0) {
            const box1 = await elem1.boundingBox();
            const box2 = await elem2.boundingBox();
            
            const overlapX = !(box1.x + box1.width <= box2.x || box2.x + box2.width <= box1.x);
            const overlapY = !(box1.y + box1.height <= box2.y || box2.y + box2.height <= box1.y);
            
            if (overlapX && overlapY) {
              throw new Error(`${elements[i].name} и ${elements[j].name} пересекаются`);
            }
          }
        }
      }
    });
    
    await allure.step('3. Проверяем цвета кнопок', async () => {
      const buttons = [
        { selector: 'a.head-top__button[href="/connection/"]', expectedClass: 'head-top__button button button--icon hearth lightBlue' },
        { selector: 'a.head-top__button[href*="tekhnicheskoe-obsluzhivanie"]', expectedClass: 'head-top__button button button--icon orange tech_service_main' },
        { selector: 'a.head-top__button[href="/business/"]', expectedClass: 'head-top__button button darkBlue head-business-btn' }
      ];
      
      for (const button of buttons) {
        const btn = page.locator(button.selector);
        if (await btn.count() > 0) {
          const classes = await btn.getAttribute('class');
          expect(classes).toContain(button.expectedClass);
          
          await allure.attachment(
            `Кнопка ${button.expectedClass}`,
            await btn.screenshot(),
            'image/png'
          );
        }
      }
    });
  });

  //ПРОВЕРКА ВЫПОДАЮЩЕГО МЕНО
  test('ID: DROP_DOWN_MENU_01 - Провекра выподающего меню', async ({ page, browserName }) => {
    await allure.story('Выподающее меню проверка работоспособности');
    await allure.severity('medium');
    await page.goto('https://mosoblgaz.ru/');  
    
    allure.parameter('Браузер', browserName);

    const dropdownTestConfigs = [
  {
    name: 'Газфикация',
    selector: 'ul.js-head-bottom-menu-list > li.js-head-bottom-menu-list-item > a.head-bottom__menu-link.js-second-menu-open.menu-icon.menu-icon--fire[href="/connection/"]',
    expectedText: 'Газификация',
    dropMenulocator: '#second-menu-699',
    expectedMenuTitle: 'Подключение газа',
    screenshotName: 'connection-gas-menu'
  },
  {
    name: 'Оплата и передача показаний',
    selector: 'ul.js-head-bottom-menu-list > li.js-head-bottom-menu-list-item > a.head-bottom__menu-link.js-second-menu-open[href="/payment/"]',
    expectedText: 'Оплата и передача показаний',
    dropMenulocator: '#second-menu-712',
    expectedMenuTitle: 'Оплата и передача показаний',
    screenshotName: 'connection-pay-and-indications-menu'
  },
  {
    name: 'Услуги для абонентов',
    selector: 'ul.js-head-bottom-menu-list > li.js-head-bottom-menu-list-item > a.head-bottom__menu-link.js-second-menu-open[href="/abonents/"]',
    expectedText: 'Услуги для абонентов',
    dropMenulocator: '#second-menu-724',
    expectedMenuTitle: 'Обслуживание оборудования',
    screenshotName: 'connection-services-for-subscribers-menu'
  },
  {
    name: 'О компании',
    selector: 'ul.js-head-bottom-menu-list > li.js-head-bottom-menu-list-item > a.head-bottom__menu-link.js-second-menu-open[href="/company/"]',
    expectedText: 'О компании',
    dropMenulocator: '#second-menu-737',
    expectedMenuTitle: 'О компании',
    screenshotName: 'connection-about-company-menu'
  },
    {
    name: 'Помощь',
    selector: 'ul.js-head-bottom-menu-list > li.js-head-bottom-menu-list-item > a.head-bottom__menu-link.js-second-menu-open[href="/help/"]',
    expectedText: 'Помощь',
    dropMenulocator: '#second-menu-756',
    expectedMenuTitle: 'Справочный центр',
    screenshotName: 'connection-about-company-menu'
  }
];

    for (const config of dropdownTestConfigs) {
    await testDropdownMenu(
      page,
      config,
      `Открытие выподающего меню "${config.name}"`
    );
  }



  });

  //КРОСС-БРАУЗЕРНАЯ ПРОВЕРКА (Chrome, Firefox, Edge)
  test('ID: CROSS_BROWSER_01 - Базовая проверка в разных браузерах', async ({ page, browserName }) => {
    await allure.story('Кросс-браузерная совместимость');
    await allure.severity('medium');
    await page.goto('https://mosoblgaz.ru/');  
    
    allure.parameter('Браузер', browserName);
    
    const criticalElements = [
      '.head-top__logo-link',
      'a.header-top__im.tablet-hide',
      'a.head-top__phone-link',
      'a.head-top__right-link.tablet-hide[href="/contacts"]',
      'a.head-top__right-link[href="/en"]',
      '.head-top__buttons'
    ];
    
    for (const selector of criticalElements) {
      const element = page.locator(selector);
      const isVisible = await element.isVisible().catch(() => false);
      
      await allure.step(`Элемент ${selector} виден в ${browserName}`, async () => {
        expect(isVisible).toBe(true);
        
        if (isVisible) {
          const display = await element.evaluate(el => 
            window.getComputedStyle(el).display
          );
          expect(display).not.toBe('none');
          expect(display).not.toBe('hidden');
        }
      });
    }
    
    await allure.attachment(
      `Внешний вид в ${browserName}`,
      await page.screenshot({ fullPage: false }),
      'image/png'
    );
  });



});

