const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const puppeteer = require('puppeteer');
require('express-zip');
const fs = require('fs');
const { execSync } = require("child_process");
const app = express();

app.use(bodyParser.json());
app.use(cors());
app.use(express.static(__dirname + '/public'));

function urlChecker(url){
    return /https:\/\/(.*)\.box\.com\/(.*)/.test(url);
}

app.post("/download", async function(req, res){
    const currentDate = Date.now();
    fs.mkdirSync(`./tmp/${currentDate}`);
    const filePaths = [];
    const links = req.body.links;
    let realTitle = "";

    for(let i = 0; i < links.length; i++){
        if(!urlChecker(links[i])){
            continue;
        }
        console.log(`Link ${links[i]} is a valid box.com link.`);
        const browser = await puppeteer.launch({
            executablePath:
                process.env.NODE_ENV === "production"
                    ? process.env.PUPPETEER_EXECUTABLE_PATH
                    : puppeteer.executablePath(),
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--single-process', '--no-zygote']
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });
        await page.goto(links[i], { waitUntil: "networkidle0" });
        const title = await page.title();
        realTitle = title.slice(0, title.indexOf("."));
        console.log("page title:", realTitle);
        const networkRequestsStr = await page.evaluate(function(){
            return JSON.stringify(window.performance.getEntries());
        });
        // console.log(networkRequestsStr);
        const networkRequests = JSON.parse(networkRequestsStr);
        // console.log(networkRequests);
        let downloadUrl = "";
        for(let j = 0; j < networkRequests.length; j++){
            // console.log(networkRequests[j].name);
            if( (networkRequests[j].name.includes("public.boxcloud.com/api/2.0/files") || "dl.boxcloud.com/api/2.0/files") && networkRequests[j].name.includes("content?preview=true") ){
                downloadUrl = networkRequests[j].name;
            }
            else if(networkRequests[j].name.includes("internal_files") && networkRequests[j].name.includes("pdf")){
                downloadUrl = networkRequests[j].name;
            }
        }
        
        if(downloadUrl !== ""){
            console.log(downloadUrl);
            try{
                const result = execSync(`wget -O ./tmp/${currentDate}/${realTitle}.pdf ${downloadUrl}`);
                filePaths.push({ name: realTitle + ".pdf", path: "./tmp/" + currentDate + "/" + realTitle + ".pdf" });
            }catch(e){
                console.log(e);
            }
        }

        await page.close();
    }
    console.log(filePaths);
    if(filePaths.length === 1){
        res.download(filePaths[0].path, realTitle + ".pdf");
    }else{
        res.zip(filePaths, currentDate);
    }
});

app.listen(3000, function(){
    console.log('BoxDL Service: Listening on port 3000.');
});