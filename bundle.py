from pathlib import Path
root=Path(__file__).parent
order=(root/'module-order.txt').read_text().splitlines()
if 'src/belv-mdt.js' not in order: order.insert(0,'src/belv-mdt.js')
header=(root/'bundle-header.txt').read_text().replace('20.1.1 CIA Expanded','20.4.0 Crown City RP')
factories=[]
for name in order:
    factories.append('"'+name+'": function(module, exports, require) {\n'+(root/name).read_text().rstrip('\n')+'\n\n}')
(root.parent/'index.js').write_text(header+',\n'.join(factories)+(root/'bundle-footer.txt').read_text())
print('Bundled',len(factories),'modules.')
