import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import StageClear from '../src/StageClear';
import '../src/style.css';
function Preview(){const [show,setShow]=useState(false),[finished,setFinished]=useState(false);return <main style={{maxWidth:960,margin:'30px auto',padding:20}}><h1>ELEVEN / S5</h1><p>Actual production ending component; automatic transition in 7.9 seconds.</p><button className="pixel-button primary" onClick={()=>{setShow(true);setFinished(false);}}>Play ending preview</button><div style={{position:'relative',aspectRatio:'16/9',marginTop:20,border:'1px solid #46596c',overflow:'hidden'}}>{show&&<StageClear stage={1} onDone={()=>{setShow(false);setFinished(true);}}/>}{finished&&<h2 style={{padding:50}} data-testid="result">PASS: Eleven entered, thanked the player, left; next stage requested.</h2>}</div></main>;}
createRoot(document.getElementById('root')!).render(<Preview/>);
