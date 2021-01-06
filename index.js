const Nightmare = require('nightmare');
const nightmare = Nightmare({ show: true });

const { JSDOM } = require('jsdom');
const { window } = new JSDOM();
const $ = require("jquery")(window);

// 讀寫檔案 
const util = require('util');
const fs = require('fs');

const mkdir = util.promisify(fs.mkdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

const { default: axios } = require('axios');
const { resolve } = require('path');

// 重要
// callback
// promise
// async await

let arrLink = [];

async function searchKeyword() {
    console.log('Start searching...');
    await nightmare
    .goto('https://tw.buy.yahoo.com/search/product?p=gopro')
    .wait(1000)
    .catch(error => {
      console.error('Search failed:', error)
    })
}

async function parseHtml() {
    console.log('parseHtml');

    let html = await nightmare.evaluate(()=> {
        return document.documentElement.innerHTML;
    })

    let count = 0;

    $(html).find('.BaseGridItem__grid___2wuJ7').each((index, element)=>{
        let name = $(element).find('.BaseGridItem__title___2HWui').text();
        let price = $(element).find('.BaseGridItem__price___31jkj').text();
        let href = $(element).find('a').attr('href');
        console.log('name', name);
        console.log('price', price);

        // scope
        let obj = {};
        obj.name = name;
        obj.price = price;
        obj.href = href;

        arrLink.push(obj);
    });
    await wrirteJson();
}

async function getData(){
    console.log('getData');

    let data = JSON.parse(await readFile("output/gopro.json"));
    console.log('data', data);

    for (let i=0; i<data.length; i++){
        const data2 = await parseDetail(data[i].href);

        arrLink[i]["pics"] = data2.pics;
        arrLink[i]["productSpec"] = data2.productSpec;
        await wrirteJson();
    }
}

async function parseDetail(url){
    console.log('url', url);

    let allData = {};
    let picsArray = [];

    await nightmare.goto(url).wait(1000);

    let html = await nightmare.evaluate(()=>{
        return document.documentElement.innerHTML;
    })
    
    let totalPics = $(html).find(".ImageHover__thumbnailList___1qqYN > span").length;

    for (let i=1; i <= totalPics; i++){
        await nightmare.mouseover("div.ImageHover__thumbnailList___1qqYN > span:nth-child(" + i + ")").wait(1000)

        let html2 = await nightmare.evaluate(()=>{
            return document.documentElement.innerHTML;
        })

        if($(html2).find(".LensImage__img___3khRA").attr('src') != undefined){
            picsArray.push($(html2).find(".LensImage__img___3khRA").attr('src'))
        }
    }

    allData["pics"] = picsArray;

    await scrollPage();

    html = await nightmare.evaluate(()=>{
        return document.documentElement.innerHTML;
    })

    let productSpec = {};

    let allProductSpec = $(html).find(".ProductHtmlDetail__spec___pa_3- >table > tbody > tr");

    allProductSpec.each(function(index, element){
        productSpec[$(this).find("th").text()] = $(this).find("td").text();
    })

    allData["productSpec"] = productSpec;

    console.log('allData', allData);

    return allData;
}

async function scrollPage() {
    console.log('scrollPage');

    let currentHeight = 0;
    let offset = 0;

    while (offset <= currentHeight) {
        currentHeight = await nightmare.evaluate(()=>{
            return document.documentElement.scrollHeight;
        })

        offset += 500;
        await nightmare.scrollTo(offset, 0).wait(500);
    }
}

async function downloadImgs() {
    let data = JSON.parse(await readFile("output/gopro.json"));
    // console.log('data', data);

    for (let i=0; i<data.length; i++){
        console.log('downloadImgs i=', i);
        let rootDir = './img';

        if(!fs.existsSync(rootDir)) fs.mkdirSync(rootDir);

        const keyword = "./img/" + "gopro";
        if(!fs.existsSync(keyword)) fs.mkdirSync(keyword);

        let picsDir = "./img/gopro/" + data[i].name.replace(/\//g, "");
        if(!fs.existsSync(picsDir)) fs.mkdirSync(picsDir);

        for (let picNum = 0; picNum < data[i].pics.length; picNum++){
            const url = data[i].pics[picNum];
            const filename = picsDir + "/" + picNum + ".jpg"

            await downloadEachPic(url, filename);
        }
    }
}

const downloadEachPic = (url, filename) => {
    axios({
        url, 
        responseType: "stream"
    }).then(response => 
        new Promise((resolve, reject) =>{
            response.data.pipe(fs.createWriteStream(filename))
            .on("finish", ()=> resolve())
            .on("error", e => reject(e))
        })
    )
}

async function wrirteJson(){
    if(!fs.existsSync("output")){
        await mkdir("output", { recursive: true});
    }

    await writeFile(
        "output/" + "gopro.json",
        JSON.stringify(arrLink, null, 2)
    );
}

async function close(){
    await nightmare.end((err)=>{
        if (err) throw err;
        console.log('Nightmare is closed.');
    })
}

async function asyncArray(functionList){
    for (let func of functionList){
        await func();
    }
}

try{
    // asyncArray([searchKeyword, parseHtml, getData, close]).then( async ()=> {console.log('Done.');})
    asyncArray([downloadImgs]).then( async ()=> {console.log('Done.');})
} catch(err){
    console.log('err: ', err);
}