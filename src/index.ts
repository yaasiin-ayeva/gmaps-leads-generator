import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import ExcelJS from 'exceljs';

dotenv.config();

const apiKey = process.env.GOOGLE_MAPS_API_KEY;

if (!apiKey) {
    console.error('API Key is missing');
    process.exit(1);
}

const leads: any[] = [];
const companyNames = new Set<string>();

async function fetchLeads(query: string) {
    let nextPageToken: string | undefined;
    let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}`;

    try {
        do {
            if (nextPageToken) {
                url = `https://maps.googleapis.com/maps/api/place/textsearch/json?pagetoken=${nextPageToken}&key=${apiKey}`;
            }

            const response = await fetch(url);
            const data: any = await response.json();

            if (data.results) {
                for (const place of data.results) {
                    const rating = place.rating || 0;

                    if (rating < 4.5) {
                        const companyData = await fetchPlaceDetails(place.place_id);
                        if (companyData) {
                            if (!companyNames.has(companyData.name)) {
                                companyNames.add(companyData.name);

                                if (companyData.website && companyData.website != "Not available" && companyData.email == "Not available") {
                                    companyData.email = await getEmailFromWebsite(companyData.website);
                                }

                                leads.push(companyData);
                            }
                        }
                    }
                }
            }

            nextPageToken = data.next_page_token;

            if (nextPageToken) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        } while (nextPageToken);

    } catch (error) {
        console.error('Error fetching leads:', error);
    }
}

async function fetchPlaceDetails(placeId: string) {
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${apiKey}`;

    try {
        const response = await fetch(detailsUrl);
        const details: any = await response.json();

        if (details.result) {
            const result = details.result;

            const companyName = result.name;
            const phoneNumber = result.formatted_phone_number || 'Not available';
            const website = result.website || 'Not available';
            const rating = result.rating || 'Not available';
            let email = result.email || 'Not available';

            const reviews = result.reviews || [];
            const badReviews = reviews
                .filter((review: any) => review.rating < 3)
                .sort((a: any, b: any) => a.rating - b.rating)
                .slice(0, 2);

            return {
                name: companyName,
                email: email,
                phoneNumber: phoneNumber,
                website: website,
                rating: rating,
                reviews: badReviews
            };
        }
    } catch (error) {
        console.error('Error fetching place details:', error);
    }
}

async function getEmailFromWebsite(website: string): Promise<string> {
    try {
        const response = await fetch(website);
        const html = await response.text();

        const emailMatch = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        return emailMatch ? emailMatch[0] : 'Not available';
    } catch (error) {
        console.error('Error fetching website:', error);
        return 'Not available';
    }
}

async function generateExcel(leads: any[]) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Leads');

    worksheet.columns = [
        { header: 'Company Name', key: 'name', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Phone Number', key: 'phoneNumber', width: 15 },
        { header: 'Website', key: 'website', width: 25 },
        { header: 'Rating', key: 'rating', width: 10 },
        { header: 'Bad Review 1', key: 'badReview1', width: 50 },
        { header: 'Reviewer 1', key: 'reviewer1', width: 20 },
        { header: 'Bad Review 2', key: 'badReview2', width: 50 },
        { header: 'Reviewer 2', key: 'reviewer2', width: 20 }
    ];

    leads.forEach(lead => {
        worksheet.addRow({
            name: lead.name,
            email: lead.email,
            phoneNumber: lead.phoneNumber,
            website: lead.website,
            rating: lead.rating,
            badReview1: lead.reviews[0]?.text || 'None',
            reviewer1: lead.reviews[0]?.author_name || 'None',
            badReview2: lead.reviews[1]?.text || 'None',
            reviewer2: lead.reviews[1]?.author_name || 'None',
        });
    });

    const filePath = './Leads.xlsx';
    await workbook.xlsx.writeFile(filePath);

    console.log(`Excel file has been generated at ${filePath}`);
}

const queries = [
    "Accounting firms in Ghana",
    "Auditing services in Ghana",
    "Tax consultants in Ghana",
    "Bookkeeping services in Ghana",
    "Financial advisory services in Ghana",
    "Payroll services in Ghana",
    "Forensic accounting firms in Ghana",
    "Management accounting firms in Ghana",
    "Cost accounting services in Ghana",
    "Corporate tax services in Ghana",
    "Personal tax accountants in Ghana",
    "Business accounting services in Ghana",
    "Accounting software consultants in Ghana",
    "Financial planning firms in Ghana",
    "Business valuation services in Ghana",
    "Internal auditing services in Ghana",
    "External auditing firms in Ghana",
    "Consulting accountants in Ghana",
    "Accounting and bookkeeping services in Accra",
    "Auditing firms in Accra",
    "Tax filing services in Accra",
    "Accounting advisory firms in Accra",
    "Financial accounting services in Accra",
    "Corporate accountants in Accra",
    "Certified public accountants in Accra",
    "Financial analysis firms in Ghana",
    "Tax compliance services in Ghana",
    "Startup accounting services in Ghana",
    "Investment advisory firms in Ghana",
    "Small business accounting services in Ghana",
    "Tax preparation services in Ghana",
    "Financial reporting services in Ghana",
    "Business tax consulting in Ghana",
    "Outsourced accounting firms in Ghana",
    "Accounting firms specializing in SMEs in Ghana",
    "Estate planning accountants in Ghana",
    "Trust accounting services in Ghana",
    "International tax advisors in Ghana",
    "Non-profit accounting services in Ghana",
    "Grant management accountants in Ghana",
    "Compliance accounting firms in Ghana"
];


async function fetchAllLeads() {
    let i = 0;
    for (const query of queries) {
        console.log(`Query ${++i}/${queries.length}: ${query}`);
        await fetchLeads(query);
    }

    await generateExcel(leads);
}

fetchAllLeads();
