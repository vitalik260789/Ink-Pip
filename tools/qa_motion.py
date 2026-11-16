import json, subprocess, numpy as np, cv2
import sys; V=sys.argv[1]; SH=json.load(open(sys.argv[2]))['shots']
FPS=24; W,H=640,360; K=2.0  # px scale to 1280x720
cuts=set(int(round(s['start']*FPS)) for s in SH)
kind_at=lambda f: next((s['kind'] for s in SH if s['start']*FPS<=f<s['end']*FPS),'board')
p=subprocess.Popen(['ffmpeg','-v','error','-i',V,'-vf',f'scale={W}:{H}','-f','rawvideo','-pix_fmt','gray','-'],stdout=subprocess.PIPE)
mask=np.full((H,W),255,np.uint8); mask[:20]=0; mask[-20:]=0; mask[290:340]=0; mask[28:60,0:180]=0
prev=None; f=0; R=[]
while True:
    b=p.stdout.read(W*H)
    if len(b)<W*H: break
    g=np.frombuffer(b,np.uint8).reshape(H,W)
    if prev is not None and not any(abs(f-c)<=1 for c in cuts):
        pts=cv2.goodFeaturesToTrack(prev,400,0.01,7,mask=mask)
        if pts is not None and len(pts)>=12:
            nxt,st,_=cv2.calcOpticalFlowPyrLK(prev,g,pts,None,winSize=(21,21),maxLevel=3)
            ok=st.ravel()==1
            if ok.sum()>=10:
                M,inl=cv2.estimateAffinePartial2D(pts[ok],nxt[ok],method=cv2.RANSAC,ransacReprojThreshold=1.0)
                if M is not None:
                    s=np.hypot(M[0,0],M[1,0]); rot=np.degrees(np.arctan2(M[1,0],M[0,0]))
                    # translation of the frame centre
                    c=np.array([W/2,H/2]); tc=M[:,:2]@c+M[:,2]-c
                    R.append((f,kind_at(f),np.hypot(*tc)*K,(s-1)*100,rot))
    prev=g; f+=1
R=np.array([(a,0,b,c,d) for a,k,b,c,d in R],float); kinds=[k for a,k,b,c,d in [(r[0],kind_at(int(r[0])),0,0,0) for r in R]]
tr,zm,rt=R[:,2],R[:,3],R[:,4]
moving=(tr>0.5)|(np.abs(zm)>0.05)|(np.abs(rt)>0.03)
print('frames analysed',len(R),'of',f)
print('moving frames %%: %.0f'%(100*moving.mean()))
print('still (<0.5px, |zoom|<0.05%%/f): %.0f%%'%(100*(~moving).mean()))
print('zoom %%/f median (all): %.3f   among non-panning frames: %.3f'%(np.median(zm),np.median(zm[tr<0.5])))
print('push-in frames (zoom>0.05%%/f): %.0f%%'%(100*(zm>0.05).mean()))
print('translation px/f@720p: median %.2f  p90 %.1f  p99 %.1f  max %.1f'%(np.median(tr),np.percentile(tr,90),np.percentile(tr,99),tr.max()))
print('roll deg/f: median |%.3f|'%np.median(np.abs(rt)))
for k in ['room','space','dial','earth','planet','board']:
    sel=np.array([kk==k for kk in kinds])
    if sel.any(): print(f'  {k:7s} moving {100*moving[sel].mean():.0f}%  zoom median {np.median(zm[sel]):.3f}%/f  trans median {np.median(tr[sel]):.2f}px/f')
dur=f/FPS; print('hard cuts: %d in %.0f s -> %.1f per minute; median shot %.1f s'%(len(SH)-1,dur,(len(SH)-1)/(dur/60),np.median([s['end']-s['start'] for s in SH])))
# reference-style classes and bursts (speed incl. zoom, 720p px/f, converted to 30 fps)
spd=(tr+np.abs(zm)/100*734)*24/30
print('hold <0.3: %.0f%%  drift 0.3-2: %.0f%%  move >=2: %.0f%%  median %.1f  p90 %.1f px/f@720,30fps'%(100*(spd<0.3).mean(),100*((spd>=0.3)&(spd<2)).mean(),100*(spd>=2).mean(),np.median(spd),np.percentile(spd,90)))
from scipy.signal import find_peaks
pk,_=find_peaks(spd,height=6,distance=8); print('moves (peaks>=6) per 10 s: %.1f   peak speed median %.1f  p90 %.1f'%(len(pk)/(len(spd)/24)*10,np.median(spd[pk]) if len(pk) else 0,np.percentile(spd[pk],90) if len(pk) else 0))
