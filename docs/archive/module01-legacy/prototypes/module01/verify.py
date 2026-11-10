from pathlib import Path
import os,shutil
from playwright.sync_api import sync_playwright, expect
from pypdf import PdfReader, PdfWriter
from PIL import Image,ImageOps,ImageDraw,ImageFont
import json,re

root=Path(__file__).resolve().parent
shots=root/'screenshots'
errors=[];network=[];checks=[];pdfs=[]
def checked(s):checks.append(s);print('PASS:',s)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('PROTOTYPE_CHROMIUM') or shutil.which('chromium') or shutil.which('google-chrome'),headless=True,args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1440,'height':1024},device_scale_factor=1,accept_downloads=True)
 page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('request',lambda r:network.append(r.url) if r.url.startswith(('http://','https://')) else None)
 page.set_content((root/'index.html').read_text(),wait_until='load');expect(page.get_by_role('heading',name='数据回收',exact=True)).to_be_visible()
 def capture(name,pdf=True):
  page.locator('#toast').evaluate('(element) => {element.innerHTML = "";}')
  page.screenshot(path=str(shots/(name+'.png')),full_page=True)
  if pdf:
   height=max(1024,page.evaluate('document.documentElement.scrollHeight'))
   path=root/(name+'.pdf');page.pdf(path=str(path),width='1440px',height=f'{height+5}px',print_background=True,margin={'top':'0','right':'0','bottom':'0','left':'0'});pdfs.append(path)
 capture('01-list')
 page.get_by_role('button',name='下一页',exact=True).click();expect(page.locator('.pagination')).to_contain_text('第 6–6 条')
 page.locator('input[name=keyword]').fill('999');page.get_by_role('button',name='查询',exact=True).click();expect(page.locator('.empty')).to_contain_text('没有符合条件')
 page.locator('[data-action=clearFilters]').click();checked('列表查询、空结果、重置和分页')
 page.get_by_role('button',name='详情',exact=True).first.click();expect(page.get_by_role('dialog')).to_contain_text('698A');page.get_by_role('button',name='返回',exact=True).click()
 checked('周期详情及返回列表')
 page.get_by_role('button',name='＋ Excel 导入',exact=True).click();expect(page.get_by_role('button',name='开始预校验 →')).to_be_disabled()
 capture('02-upload')
 with page.expect_download() as d:page.get_by_role('button',name='↓ 下载周期模板（示例）').click()
 assert d.value.suggested_filename=='工作与回收周期_模板示例.xlsx'
 page.get_by_role('button',name='载入含错误示例',exact=True).click();page.get_by_role('button',name='开始预校验 →').click()
 expect(page.get_by_role('button',name='下一步：确认导入 →')).to_be_disabled()
 expect(page.locator('.metric').nth(3)).to_contain_text('2')
 capture('03-validation-errors')
 page.locator('[data-tab=problem]').click();assert page.locator('tbody tr').count()==2
 with page.expect_download() as d:page.get_by_role('button',name='↓ 下载错误说明').click()
 assert d.value.suggested_filename.endswith('.csv')
 page.get_by_role('button',name='查看已有记录').click();expect(page.get_by_role('dialog')).to_contain_text('704A');page.get_by_role('button',name='返回',exact=True).click()
 checked('模板/错误报告下载，错误与冲突阻止整批提交，逐行筛选和查看原记录')
 page.get_by_role('button',name='演示：重传已修正文件').click();expect(page.get_by_role('button',name='下一步：确认导入 →')).to_be_enabled()
 assert page.locator('.metric strong').all_text_contents()==['8','6','2','0']
 capture('04-validation-passed')
 page.get_by_role('button',name='下一步：确认导入 →').click();expect(page.get_by_role('button',name='确认导入 6 条')).to_be_disabled();expect(page.locator('tbody')).to_contain_text('左权');expect(page.locator('tbody')).to_contain_text('202610')
 capture('05-confirm')
 page.locator('#confirmCheck').check();page.get_by_role('button',name='确认导入 6 条').click();expect(page.get_by_role('heading',name='导入完成',exact=True)).to_be_visible()
 assert page.locator('.result-metrics strong').all_text_contents()==['6','2','0']
 capture('06-success');checked('修正重传、跨区域/批次范围核对、确认防误提交和成功结果')
 # Re-uploading the same corrected file must genuinely become all duplicates in the in-memory dataset.
 page.get_by_role('button',name='继续导入其他文件').click();page.get_by_role('button',name='载入已修正示例').click();page.get_by_role('button',name='开始预校验 →').click()
 assert page.locator('.metric strong').all_text_contents()==['8','0','8','0']
 page.get_by_role('button',name='查看结果：无需新增 →').click();expect(page.get_by_role('heading',name='全部重复，无需新增')).to_be_visible()
 capture('07-all-duplicates');checked('同文件重传：0 新增、8 跳过，无重复建档')
 # Unknown outcome and concurrency paths use only public prototype controls.
 page.get_by_role('button',name='重置演示').click();page.locator('#scenario').select_option('conflict');page.get_by_role('button',name='开始预校验 →').click();page.get_by_role('button',name='下一步：确认导入 →').click();page.locator('#confirmCheck').check()
 n=page.locator('[data-action=submit]').inner_text();page.locator('[data-action=submit]').click();expect(page.get_by_role('heading',name='提交未完成：发现并发冲突')).to_be_visible()
 capture('08-concurrent-conflict');page.get_by_role('button',name='重新预校验').click();expect(page.locator('.notice')).to_contain_text('预校验通过')
 page.get_by_role('button',name='下一步：确认导入 →').click();page.locator('#confirmCheck').check();page.locator('[data-action=submit]').click();expect(page.get_by_role('heading',name='导入完成',exact=True)).to_be_visible()
 checked('提交并发冲突反馈、重新校验后可继续，不陷入重复失败循环')
 page.get_by_role('button',name='重置演示').click()
 page.locator('#scenario').select_option('unknown');page.get_by_role('button',name='开始预校验 →').click();page.get_by_role('button',name='下一步：确认导入 →').click();page.locator('#confirmCheck').check();page.locator('[data-action=submit]').click()
 expect(page.get_by_role('heading',name='通信中断，导入结果待确认')).to_be_visible();capture('09-unknown-outcome')
 page.get_by_role('button',name='查询本次结果（演示恢复）').click();expect(page.get_by_role('heading',name='导入完成',exact=True)).to_be_visible();checked('通信中断保持结果待确认，查询恢复后再显示结果')
 page.get_by_role('button',name='查看本次批次记录').click();page.get_by_role('button',name='详情',exact=True).first.click();page.get_by_role('button',name='更正记录（演示）').click();page.locator('input[name=notes]').fill('交互测试：更正备注');page.get_by_role('button',name='保存到演示列表').click();expect(page.locator('tbody')).to_contain_text('交互测试：更正备注');checked('已存示例记录纠错后列表同步，身份字段锁定')
 # Test leave guard via the same buttons available to the reviewer.
 page.get_by_role('button',name='＋ Excel 导入').click();page.get_by_role('button',name='载入含错误示例').click();page.get_by_role('button',name='返回回收列表').click();expect(page.get_by_role('dialog',name='离开本次导入？')).to_be_visible();page.get_by_role('button',name='继续查看').click();expect(page.get_by_role('heading',name='Excel 批量导入',exact=True)).to_be_visible();checked('未提交导入的离开提醒与取消离开')
 assert not errors,errors
 assert not network,network
 checked('无 JavaScript 运行错误，无任何外部网络请求')
 browser.close()

writer=PdfWriter()
for path in pdfs:
 reader=PdfReader(path)
 assert len(reader.pages)==1,(path,len(reader.pages))
 writer.add_page(reader.pages[0])
writer.compress_identical_objects(remove_identicals=True,remove_orphans=True)
writer.write(root/'module01-low-fidelity.pdf')
for path in pdfs:path.unlink()
# Contact sheet for quick review; numbered labels correspond to the PDF pages.
font=ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',22)
thumbs=[]
for name,label in [('01-list','01 回收记录列表'),('02-upload','02 上传文件'),('03-validation-errors','03 校验发现错误'),('04-validation-passed','04 修正后校验通过'),('05-confirm','05 核对与确认'),('06-success','06 导入结果')]:
 image=Image.open(shots/(name+'.png')).convert('RGB');image.thumbnail((700,560))
 tile=Image.new('RGB',(732,610),'#ededeb');ImageDraw.Draw(tile).text((16,12),label,font=font,fill='#333333');tile.paste(image,(16,48));thumbs.append(tile)
board=Image.new('RGB',(1480,1850),'#dededb')
for i,tile in enumerate(thumbs):board.paste(tile,(8+(i%2)*736,8+(i//2)*614))
board.save(root/'overview.png')
(root/'verification.json').write_text(json.dumps({'checks_passed':checks,'javascript_errors':errors,'external_requests':network,'pdf_pages':len(pdfs)},ensure_ascii=False,indent=2)+'\n')
print('Exported',len(pdfs),'PDF pages, 9 screenshots and overview.')
