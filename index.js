const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    await page.goto('https://www.google.com/maps/search/construction+companies+in+United+States/@34.518,-118.0745673,4z/data=!3m1!4b1!5m1!1e1?entry=ttu&g_ep=EgoyMDI0MTAyOS4wIKXMDSoASAFQAw%3D%3D', { waitUntil: 'networkidle2' });

    const scrollToBottom = async () => {
        await page.evaluate(() => {
            window.scrollBy(0, window.innerHeight);
        });
        await page.waitForTimeout(2000);
    };

    const getCompanyDetails = async (companyElement) => {
        await companyElement.click();

        await new Promise(resolve => setTimeout(resolve, 3000));

        const rating = await page.evaluate(() => {
            const ratingElement = document.querySelector('.fontDisplayLarge');
            return ratingElement ? parseFloat(ratingElement.innerText) : null;
        });

        // if (rating > 4.5) {
        //     await page.goBack();
        //     return null;
        // }

        console.log('rating :', rating);

        const details = await page.evaluate(() => {

            const infos = document.querySelectorAll('.AeaXub .Io6YTe.fontBodyMedium.kR99db.fdkmkc');

            console.log('infos :', infos);

            const phone = document.querySelector('.AeaXub .Io6YTe fontBodyMedium.kR99db')?.innerText || '';
            const website = document.querySelector('.AeaXub .Io6YTe.fontBodyMedium.kR99db')?.innerText || '';

            console.log('phone :', phone);
            console.log('website :', website);

            const reviews = [];
            document.querySelectorAll('.jftiEf.fontBodyMedium').forEach(review => {
                const ratingText = review.querySelector('[aria-label*="star"]')?.getAttribute('aria-label') || '';
                const starRating = parseFloat(ratingText.split(' ')[0]);
                if (starRating < 3 && reviews.length < 2) {
                    const author = review.querySelector('.d4r55')?.innerText || '';
                    const text = review.querySelector('.wiI7pd')?.innerText || '';
                    reviews.push({ author, text });
                }
            });

            return { phone, website, reviews };
        });

        await page.goBack();
        return details;
    };

    const companies = await page.$$('a.hfpxzc');

    let i = 0;

    for (const company of companies) {
        const details = await getCompanyDetails(company);
        if (details) {
            console.log(details);
        }
    }

    await browser.close();
})();
