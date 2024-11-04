const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    // Naviguer vers la page des résultats Google Maps
    await page.goto('https://www.google.com/maps/search/construction+companies+in+United+States/@34.518,-118.0745673,4z/data=!3m1!4b1!5m1!1e1?entry=ttu&g_ep=EgoyMDI0MTAyOS4wIKXMDSoASAFQAw%3D%3D', { waitUntil: 'networkidle2' });

    // Fonction de scroll pour charger plus de résultats dans la liste des entreprises
    const scrollToBottom = async () => {
        await page.evaluate(() => {
            window.scrollBy(0, window.innerHeight);
        });
        await page.waitForTimeout(2000);  // Attendre que les résultats chargent
    };

    const getCompanyDetails = async (companyElement) => {
        await companyElement.click();

        await new Promise(resolve => setTimeout(resolve, 3000));  // Attendre le chargement du détail de l'entreprise

        // Extraire le rating de l'entreprise
        const rating = await page.evaluate(() => {
            const ratingElement = document.querySelector('.fontDisplayLarge');
            return ratingElement ? parseFloat(ratingElement.innerText) : null;
        });

        // Si le rating est supérieur à 4.5, retour à la liste des entreprises
        // if (rating > 4.5) {
        //     await page.goBack();
        //     return null;
        // }

        console.log('rating :', rating);

        // Extraire téléphone, site web, et reviews
        const details = await page.evaluate(() => {

            const infos = document.querySelectorAll('.AeaXub .Io6YTe.fontBodyMedium.kR99db.fdkmkc');

            console.log('infos :', infos);

            const phone = document.querySelector('.AeaXub .Io6YTe fontBodyMedium.kR99db')?.innerText || '';
            const website = document.querySelector('.AeaXub .Io6YTe.fontBodyMedium.kR99db')?.innerText || '';

            console.log('phone :', phone);
            console.log('website :', website);

            // Sélectionner deux reviews à moins de 3 étoiles
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

        await page.goBack();  // Retourner à la liste des entreprises
        return details;
    };

    // Boucle pour chaque entreprise dans la liste
    const companies = await page.$$('a.hfpxzc');  // Ciblage des éléments de la liste

    let i = 0;

    for (const company of companies) {
        const details = await getCompanyDetails(company);
        if (details) {
            console.log(details);  // Afficher les informations obtenues
        }
    }

    await browser.close();
})();
