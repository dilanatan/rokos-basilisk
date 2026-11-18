import {test,expect} from '@playwright/test';
async function login(page,name='Ayşe Yılmaz',skip=true){
  await page.goto('/');
  await page.getByRole('button',{name:new RegExp(name)}).click();
  if(skip)await page.getByRole('button',{name:'Şimdilik atla'}).click();
}
async function token(page){return page.evaluate(()=>localStorage.getItem('cyberops_token'));}
test('role landing, tutorial completion and restart',async({page})=>{
  await login(page,'Mehmet Demir',false);
  await expect(page).toHaveURL(/\/reports$/);
  const tour=page.getByRole('dialog',{name:'Siteyi öğren'});
  await expect(tour).toBeVisible();
  await tour.getByRole('button',{name:'Başla'}).click();
  for(let i=0;i<5;i++)await tour.getByRole('button',{name:'Sonraki',exact:true}).click();
  await tour.getByRole('button',{name:'Tamamla'}).click();
  await expect(tour).toBeHidden();
  await page.reload();
  await expect(page.getByRole('heading',{name:'Raporlama & Bildirim'})).toBeVisible();
  await expect(tour).toBeHidden();
  await page.getByRole('button',{name:'Siteyi öğren',exact:true}).click();
  await expect(tour).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(tour).toBeHidden();
});
test('account dropdown stays clickable above content and isolates account data',async({page})=>{
  await login(page,'Zeynep Kaya');
  await expect(page).toHaveURL(/\/reports$/);
  await page.getByRole('button',{name:'Kullanıcı değiştir',exact:true}).click();
  await page.getByRole('button',{name:/Ayşe Yılmaz/}).click();
  await page.getByRole('button',{name:'Şimdilik atla'}).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('link',{name:'Raporlar',exact:true})).toHaveCount(0);
  await page.getByRole('link',{name:'Görevler',exact:true}).click();
  await expect(page.getByText('İnternet bankacılığı web pentest raporu',{exact:true})).toHaveCount(0);
});
test('team filter reaches CSV and bulk notifications',async({page})=>{
  await login(page,'Zeynep Kaya');
  await page.getByLabel('Rapor ekibi').selectOption('SOC');
  await expect(page.getByText(/Kapsam: Takım: SOC/)).toBeVisible();
  const downloadRequest=page.waitForRequest(r=>r.url().includes('/reports/tasks.csv'));
  const download=page.waitForEvent('download');
  await page.getByRole('button',{name:'CSV / Excel'}).click();
  expect(new URL((await downloadRequest).url()).searchParams.get('team')).toBe('SOC');
  await download;
  const sent=page.waitForRequest(r=>r.url().endsWith('/reports/digest')&&r.method()==='POST');
  await page.getByRole('button',{name:'Toplu bildirim gönder'}).click();
  expect((await sent).postDataJSON()).toEqual({team:'SOC'});
  await expect(page.getByText(/kişiye görev özeti bildirimi gönderildi/)).toBeVisible();
});
test('task pagination exposes records after item 500 and resets with filters',async({page,request})=>{
  await login(page);
  const auth=await token(page),headers={Authorization:'Bearer '+auth};
  for(let i=0;i<501;i++){
    const response=await request.post('/api/tasks',{headers,data:{title:'Paging browser '+String(i).padStart(3,'0'),due_date:'2099-01-01'}});
    expect(response.ok()).toBeTruthy();
  }
  await page.goto('/tasks?search=Paging%20browser&page=11');
  await expect(page.getByText('Sayfa 11 / 11')).toBeVisible();
  await expect(page.getByText('Paging browser 500',{exact:true})).toBeVisible();
  await page.getByLabel('Görev durumu').selectOption('done');
  await expect(page).not.toHaveURL(/page=11/);
  await expect(page.getByText('Filtrelere uyan görev yok.')).toBeVisible();
});
test('skill with empty category and certificate edit/delete',async({page})=>{
  await login(page);
  await page.getByRole('link',{name:'Yetkinlikler',exact:true}).click();
  await page.getByRole('button',{name:'Yetkinlik ekle',exact:true}).click();
  let modal=page.getByRole('dialog');
  await modal.getByLabel('Yetkinlik',{exact:true}).fill('Browser Skill');
  await modal.getByRole('button',{name:'Kaydet'}).click();
  await expect(modal).toBeHidden();
  await expect(page.getByText('Browser Skill',{exact:false})).toBeVisible();
  await page.getByRole('button',{name:'Sertifika ekle',exact:true}).click();
  modal=page.getByRole('dialog');
  await modal.getByLabel('Sertifika',{exact:true}).fill('Browser Certificate');
  await modal.getByRole('button',{name:'Kaydet'}).click();
  await expect(modal).toBeHidden();
  const certificate=page.getByText('Browser Certificate',{exact:true}).locator('..');
  await certificate.getByRole('button',{name:'Düzenle',exact:true}).click();
  await page.getByRole('dialog').getByLabel('Sertifika',{exact:true}).fill('Updated Browser Certificate');
  await page.getByRole('dialog').getByRole('button',{name:'Kaydet'}).click();
  await expect(page.getByText('Updated Browser Certificate',{exact:true})).toBeVisible();
  page.once('dialog',d=>d.accept());
  await page.getByText('Updated Browser Certificate',{exact:true}).locator('..').getByRole('button',{name:'Sil',exact:true}).click();
  await expect(page.getByText('Updated Browser Certificate',{exact:true})).toHaveCount(0);
});
test('calendar creates, edits and cancels a multi-day event',async({page})=>{
  await login(page,'Mehmet Demir');
  await page.getByRole('link',{name:'Etkinlikler',exact:true}).click();
  await page.getByRole('button',{name:'Sonraki ay',exact:true}).click();
  const month=new URL(page.url()).searchParams.get('month');
  await page.getByRole('button',{name:'Yeni etkinlik',exact:true}).click();
  const modal=page.getByRole('dialog');
  await modal.getByLabel('Başlık',{exact:true}).fill('Browser Training');
  await modal.getByLabel('Başlangıç',{exact:true}).fill(month+'-01');
  await modal.getByLabel('Bitiş',{exact:true}).fill(month+'-03');
  await modal.getByRole('button',{name:'Kaydet'}).click();
  await expect(modal).toBeHidden();
  await expect(page.getByRole('heading',{name:'Browser Training',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Düzenle',exact:true}).first().click();
  await modal.getByLabel('Başlık',{exact:true}).fill('Updated Browser Training');
  await modal.getByRole('button',{name:'Kaydet'}).click();
  await expect(page.getByRole('heading',{name:'Updated Browser Training',exact:true})).toBeVisible();
  await page.goto('/events?month='+month+'&date='+month+'-03');
  await expect(page.getByRole('heading',{name:'Updated Browser Training',exact:true})).toBeVisible();
  page.once('dialog',d=>d.accept());
  await page.getByRole('button',{name:'İptal',exact:true}).first().click();
  await expect(page.getByText('İptal edildi',{exact:true})).toBeVisible();
});
test('mobile menu and token revocation work',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await login(page);
  await page.getByRole('button',{name:'Gezinme menüsünü aç'}).click();
  await page.getByRole('link',{name:'API & MCP',exact:true}).click();
  await page.getByRole('button',{name:'Token oluştur',exact:true}).click();
  await expect(page.getByRole('button',{name:'Tokenı iptal et'})).toBeVisible();
  await page.getByRole('button',{name:'Tokenı iptal et'}).click();
  await expect(page.getByRole('button',{name:'Tokenı iptal et'})).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
});
test('logout propagates between tabs',async({page,context})=>{
  await login(page);
  const other=await context.newPage();
  await other.goto('/');
  await expect(other.getByRole('button',{name:'Kullanıcı değiştir',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Kullanıcı değiştir',exact:true}).click();
  await page.getByRole('button',{name:'Çıkış',exact:true}).click();
  await expect(other.getByText('Demo hesabı seçin',{exact:false})).toBeVisible();
});
test('network errors show retry instead of a blank report',async({page})=>{
  await login(page,'Mehmet Demir');
  await page.route('**/api/reports/summary',route=>route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:'Test connection failure'})}));
  await page.reload();
  await expect(page.getByText('Test connection failure',{exact:true})).toBeVisible();
  await page.unroute('**/api/reports/summary');
  await page.getByRole('button',{name:'Yeniden dene'}).click();
  await expect(page.getByRole('heading',{name:'Raporlama & Bildirim'})).toBeVisible();
});
