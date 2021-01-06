const Nightmare = require('nightmare');
const nightmare = Nightmare({ show: true });

const { JSDOM } = require('jsdom');
const { window } = new JSDOM();
const $ = require("jquery")(window);

// 重要
// callback
// promise
// async await

async function searchKeyword() {
    console.log('Start searching...');
    await nightmare
    .goto('https://www.books.com.tw/web/sys_tdrntb/books/?loc=menu_th_1_001')
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

    $(html).find('.item').each((index, element)=>{
        let name = $(element).find('.type02_bd-a').text();
        let price = $(element).find('.price_a').text();
        console.log('name', name);
        console.log('price', price);
    });
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

// 預防錯誤
// try 與 catch ，出錯不會硬執行
// 延伸閱讀： then 與 catch ， Promise

try{
    asyncArray([searchKeyword, parseHtml, close]).then( async ()=> {console.log('Done.');})
} catch(err){
    console.log('err: ', err);
}