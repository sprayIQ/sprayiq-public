import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

export default function App(){

  const mountRef = useRef(null);

  const [mixedPaint,setMixedPaint] = useState(223);

  const [gun,setGun] = useState({
    pressure:26,
    nozzle:1.3,
    viscosity:18
  });

  const [dftStats,setDftStats] = useState({
    avg:0,min:999,max:0
  });

  useEffect(()=>{

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);

    const camera = new THREE.PerspectiveCamera(
      75,
      (window.innerWidth-520)/window.innerHeight,
      0.1,1000
    );

    camera.position.set(12,10,14);

    const renderer = new THREE.WebGLRenderer({antialias:true});
    renderer.setSize(window.innerWidth-520,window.innerHeight);

    mountRef.current.innerHTML="";
    mountRef.current.appendChild(renderer.domElement);

    // ✅ CONTROL (ZOOM / ROTATE / PAN 🔥)
    const controls = new OrbitControls(camera,renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    controls.enableZoom = true;
    controls.zoomSpeed = 1.2;

    controls.enablePan = true;
    controls.panSpeed = 0.8;

    controls.enableRotate = true;
    controls.rotateSpeed = 0.8;

    controls.minDistance = 5;
    controls.maxDistance = 40;

    scene.add(new THREE.AmbientLight(0xffffff,0.7));

    const light = new THREE.DirectionalLight(0xffffff,1);
    light.position.set(5,10,5);
    scene.add(light);

    // ============================
    // ✅ AXES + LABELS
    // ============================
    scene.add(new THREE.AxesHelper(8));

    function label(text,x,y,z){
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = 256;
      canvas.height = 128;

      ctx.fillStyle = "white";
      ctx.font = "28px Arial";
      ctx.fillText(text,20,60);

      const texture = new THREE.CanvasTexture(canvas);
      const mat = new THREE.SpriteMaterial({map:texture});
      const spr = new THREE.Sprite(mat);

      spr.scale.set(2,1,1);
      spr.position.set(x,y,z);
      scene.add(spr);
    }

    label("X (Width)",5,0,0);
    label("Z (Length)",0,0,5);
    label("Y (DFT)",0,5,0);

    // ============================
    // ✅ PANEL
    // ============================
    const seg=120;
    const geo = new THREE.PlaneGeometry(10,10,seg,seg);
    const pos = geo.attributes.position;

    const primer=new Array(pos.count).fill(0);
    const base=new Array(pos.count).fill(0);
    const clear=new Array(pos.count).fill(0);

    const colors = new Float32Array(pos.count*3);
    geo.setAttribute("color",new THREE.BufferAttribute(colors,3));

    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshPhongMaterial({
        vertexColors:true,
        side:THREE.DoubleSide,
        shininess:120
      })
    );

    mesh.rotation.x = -Math.PI/2;
    scene.add(mesh);

    // ============================
    // ✅ CONE
    // ============================
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(1.2,2.5,32),
      new THREE.MeshPhongMaterial({
        color:0xffcc00,
        transparent:true,
        opacity:0.5
      })
    );

    scene.add(cone);

    let x=-4,y=4,dir=1;
    let stage=0;

    function isComplete(layer,target){
      return layer.every(v=>v>=target);
    }

    function animate(){
      requestAnimationFrame(animate);

      // ✅ spray beweging
      x+=0.05*dir;
      if(x>4){dir=-1;y-=0.4}
      if(x<-4){dir=1;y-=0.4}
      if(y<-4)y=4;

      const sx=x;
      const sy=y;

      cone.position.set(sx,2.8,sy);
      cone.lookAt(new THREE.Vector3(sx,0,sy));

      let total=0,min=999,max=0;

      const radius=1.2;

      for(let i=0;i<pos.count;i++){

        const vx=pos.getX(i);
        const vy=pos.getY(i);

        const dx=vx-sx;
        const dy=vy-sy;

        const dist=Math.sqrt(dx*dx+dy*dy);
        const spread=Math.exp(-(dist*dist)/(2*(radius*0.5)**2));

        if(dist<radius){

          const dep =
            0.02 *
            (gun.pressure/26) *
            (gun.nozzle/1.3) *
            (18/gun.viscosity) *
            spread;

          if(stage===0) primer[i]+=dep;
          else if(stage===1) base[i]+=dep;
          else clear[i]+=dep;
        }

        // ✅ LAYER STACK
        let z=0;

        if(clear[i]>0){z=3+clear[i]}
        else if(base[i]>0){z=1.5+base[i]}
        else{z=primer[i]}

        pos.setZ(i,z);

        // ✅ HEATMAP
        const dft=z*100;

        let t=dft/100;
        t=Math.max(0,Math.min(1,t));
        t=Math.pow(t,0.7);

        let r=0,g=0,b=0;

        if(t<0.33){
          r=0;
          g=t*3;
          b=1;
        }
        else if(t<0.66){
          r=(t-0.33)*3;
          g=1;
          b=1-(t-0.33)*3;
        }
        else{
          r=1;
          g=1-(t-0.66)*3;
          b=0;
        }

        colors[i*3]=r;
        colors[i*3+1]=g;
        colors[i*3+2]=b;

        total+=dft;
        min=Math.min(min,dft);
        max=Math.max(max,dft);
      }

      if(stage===0 && isComplete(primer,0.3)) stage=1;
      else if(stage===1 && isComplete(base,0.3)) stage=2;

      setDftStats({
        avg:(total/pos.count).toFixed(1),
        min:min.toFixed(1),
        max:max.toFixed(1)
      });

      geo.attributes.position.needsUpdate=true;
      geo.attributes.color.needsUpdate=true;
      geo.computeVertexNormals();

      controls.update();
      renderer.render(scene,camera);
    }

    animate();

  },[gun]);

  return(
    <div style={{display:"flex"}}>

      {/* ✅ LINKS EXACT DASHBOARD */}
      <div style={{width:260,background:"#1e1e1e",color:"white",padding:20}}>

        <h2>SprayIQ</h2>

        <h3>Data</h3>
        <button>📂 Download TDS</button><br/><br/>
        <button>📊 Export CSV</button><br/><br/>
        <button>⬇ Backend CSV</button><br/><br/>
        <button>🎯 Load Track</button>

        <hr/>

        <h3>Paint</h3>
        <input value={mixedPaint}
          onChange={e=>setMixedPaint(Number(e.target.value))}/>
        <p>Used: 223 g</p>

        <hr/>

        <h3>Gun Settings</h3>

        <p>Pressure: {gun.pressure}</p>
        <button onClick={()=>setGun({...gun,pressure:gun.pressure+1})}>+</button>
        <button onClick={()=>setGun({...gun,pressure:gun.pressure-1})}>-</button>

        <br/><br/>

        <p>Nozzle: {gun.nozzle}</p>
        <button onClick={()=>setGun({...gun,nozzle:+(gun.nozzle+0.1).toFixed(1)})}>+</button>
        <button onClick={()=>setGun({...gun,nozzle:+(gun.nozzle-0.1).toFixed(1)})}>-</button>

        <br/><br/>

        <p>Viscosity (DIN4): {gun.viscosity}</p>
        <button onClick={()=>setGun({...gun,viscosity:gun.viscosity+1})}>+</button>
        <button onClick={()=>setGun({...gun,viscosity:gun.viscosity-1})}>-</button>

      </div>

      {/* ✅ RECHTS */}
      <div style={{width:260,background:"#181818",color:"white",padding:20}}>
        <h3>DFT</h3>
        <p>Avg: {dftStats.avg}</p>
        <p>Min: {dftStats.min}</p>
        <p>Max: {dftStats.max}</p>
      </div>

      <div ref={mountRef} style={{flex:1,height:"100vh"}}/>

    </div>
  );
}