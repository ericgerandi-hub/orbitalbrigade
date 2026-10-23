# Baut die eigene Webseite (mit Mehrspieler) in das GitHub-Repository
import re,shutil,os,sys
HERE=os.path.dirname(os.path.abspath(__file__));OUT=os.path.dirname(HERE);os.chdir(HERE)
ver=re.search(r"const GAME_VER='([^']+)'",open('ob-mp.js',encoding='utf-8').read()).group(1)
src=open('orbitalbrigade.html',encoding='utf-8').read()
src=src.replace('<meta charset="utf-8">\n','')
title=re.search(r'<title>.*?</title>',src).group(0)
style=re.search(r'<style>.*?</style>',src,re.S).group(0)
body=src.replace(title,'').replace(style,'')
body=re.sub(r'<meta name="claude:viewport-fit-sides"[^>]*>\n?','',body)
links=''.join(re.findall(r'<link[^>]*>\n?',body))
body=re.sub(r'<link[^>]*>\n?','',body)
for f in ['ob-data.js','ob-world.js','ob-audio.js','ob-game.js']:
    body=body.replace(f'src="{f}"',f'src="{f}?v={ver}"')
body=body.replace('<script src="ob-game.js?v='+ver+'" charset="utf-8"></script>',
  '<script src="ob-game.js?v='+ver+'" charset="utf-8"></script>\n<script src="https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js"></script>\n<script src="ob-net.js?v='+ver+'" charset="utf-8"></script>\n<script src="ob-mp.js?v='+ver+'" charset="utf-8"></script>\n<script src="ob-vs.js?v='+ver+'" charset="utf-8"></script>\n<script src="ob-friends.js?v='+ver+'" charset="utf-8"></script>')
assert 'ob-mp.js' in body
style=style.replace('<style>','<style>\nhtml,body{margin:0}\nhtml{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);box-sizing:border-box}',1)
out=f'''<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0b0e1a">
<meta name="description" content="Orbitalbrigade – 3D-Wellenverteidigung im Orbit.">
{title}
{links}{style}
</head>
<body>
{body.strip()}
</body>
</html>
'''
open(os.path.join(OUT,'index.html'),'w',encoding='utf-8').write(out)
for f in ['ob-data.js','ob-world.js','ob-audio.js','ob-game.js','ob-net.js','ob-mp.js','ob-vs.js','ob-friends.js']:shutil.copy(f,os.path.join(OUT,f))
open(os.path.join(OUT,'.nojekyll'),'w').close()
print('ok',ver,len(out))
