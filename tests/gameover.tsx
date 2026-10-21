import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import GameOver from '../src/GameOver';
import {shouldPlayGameOver} from '../src/game/gameover';
import '../src/style.css';
function Harness(){const [lives,setLives]=useState(3),[map,setMap]=useState(false);return <div className="game-viewport"><main className="game-stage" style={{background:'#122031'}}>{map?<><img src="/assets/world-map.png" style={{width:'100%',height:'100%'}}/><span style={{position:'absolute',top:0,left:0,background:'#000',color:'#fff'}}>PASS: returned to map after video and title</span></>:<><button style={{position:'absolute',top:20,left:20,zIndex:2,color:'white'}} onClick={()=>setLives(n=>n-1)}>Lose life ({lives} remaining)</button><p style={{position:'absolute',top:'45%',left:'35%',color:'#fff'}}>LAST SIGNAL / {lives} LIVES</p>{shouldPlayGameOver(lives?'dead':'gameover',lives)&&<GameOver onDone={()=>setMap(true)}/>}</>}</main></div>;}
createRoot(document.getElementById('root')!).render(<Harness/>);
