import fs from 'node:fs';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';

const sources=['assets/fonts/site-fonts.css','assets/css/site.css','assets/css/paper.css'];
const stylesheet=postcss.parse(sources.map(file=>fs.readFileSync(file,'utf8')).join('\n'));
function compact(root){
  root.walkComments(node=>node.remove());
  root.walk(node=>{node.raws.before='';node.raws.after='';node.raws.between=node.type==='decl'?':':'';});
  return root.toString();
}
fs.writeFileSync('assets/css/bundle.css',compact(stylesheet.clone()));

// Derive the first-screen styles from the same cascade as the full stylesheet.
// Include runtime states so the menu and hero keep their final layout while CSS loads.
export function criticalStyles(markup){
  const classes=new Set([...markup.matchAll(/\bclass="([^"]+)"/g)].flatMap(m=>m[1].split(/\s+/)));
  const ids=new Set([...markup.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
  for(const name of ['has-js','page-home','is-typing','typewriter-char','is-written','typing-cursor','is-closing','modal-open','film-failed','hero-tour-enabled','reading-progress','custom-scroll'])classes.add(name);
  const root=stylesheet.clone();
  root.walkRules(rule=>{
    if(rule.parent.type==='atrule'&&/keyframes$/.test(rule.parent.name))return;
    const selectors=selectorParser().astSync(rule.selector);
    selectors.each(selector=>{
      let keep=true;
      selector.walkClasses(node=>{if(!classes.has(node.value))keep=false;});
      selector.walkIds(node=>{if(!ids.has(node.value))keep=false;});
      if(!keep)selector.remove();
    });
    if(selectors.nodes.length)rule.selector=selectors.toString();else rule.remove();
  });
  root.walkAtRules(rule=>{if(rule.nodes&&!rule.nodes.length)rule.remove();});
  return compact(root);
}
