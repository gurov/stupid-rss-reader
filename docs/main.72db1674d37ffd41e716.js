(window.webpackJsonp=window.webpackJsonp||[]).push([[1],{0:function(e,t,n){e.exports=n("zUnb")},zUnb:function(e,t,n){"use strict";n.r(t);var i=n("jhN1"),s=n("fXoL"),o=n("BvB/"),b=n("tyNb"),c=n("IAdc"),r=n("lJxs"),a=n("vkgz"),u=n("eIep"),d=n("Kj3r");class l{}class p{}var f=n("GyhO"),h=function(e){return e.FEEDS="feeds",e.POSTS="posts",e}({}),g=n("ofXK");let m=(()=>{class e{constructor(e){this.domSanitizer=e}transform(e){return this.domSanitizer.bypassSecurityTrustHtml(e)}}return e.\u0275fac=function(t){return new(t||e)(s.Ib(i.b))},e.\u0275pipe=s.Hb({name:"sanitizeHtml",type:e,pure:!0}),e})();function v(e,t){if(1&e&&s.Jb(0,"img",7),2&e){const e=s.Wb();s.Zb("src",e.post.thumbnail,s.gc)}}function y(e,t){if(1&e){const e=s.Ob();s.Nb(0,"h3",8),s.Ub("click",function(){s.ec(e);const t=s.Wb();return t.hidden=!t.hidden}),s.Xb(1,"sanitizeHtml"),s.Mb()}if(2&e){const e=s.Wb();s.Zb("innerHTML",s.Yb(1,1,e.post.title),s.fc)}}function M(e,t){if(1&e&&(s.Nb(0,"h3"),s.Jb(1,"a",9),s.Xb(2,"sanitizeHtml"),s.Nb(3,"sup"),s.jc(4," \u2197"),s.Mb(),s.Mb()),2&e){const e=s.Wb();s.yb(1),s.Zb("href",e.post.link,s.gc)("innerHTML",s.Yb(2,2,e.post.title),s.fc)}}const N=function(e){return{green:e}};function j(e,t){if(1&e){const e=s.Ob();s.Nb(0,"button",10),s.Ub("click",function(){s.ec(e);const t=s.Wb();return t.hidden=!t.hidden}),s.jc(1,"\ufe0f"),s.Jb(2,"img",11),s.Mb()}if(2&e){const e=s.Wb();s.Zb("ngClass",s.cc(1,N,e.post.isNew))}}function k(e,t){if(1&e){const e=s.Ob();s.Nb(0,"button",10),s.Ub("click",function(){s.ec(e);const t=s.Wb();return t.hidden=!t.hidden}),s.Jb(1,"img",12),s.Mb()}if(2&e){const e=s.Wb();s.Zb("ngClass",s.cc(1,N,e.post.isNew))}}function I(e,t){1&e&&(s.Nb(0,"span"),s.jc(1,", "),s.Mb())}function S(e,t){if(1&e&&(s.Nb(0,"em"),s.jc(1),s.ic(2,I,2,0,"span",5),s.Mb()),2&e){const e=t.$implicit,n=t.last;s.yb(1),s.kc(e),s.yb(1),s.Zb("ngIf",!n)}}function O(e,t){if(1&e&&(s.Nb(0,"div",16),s.ic(1,S,3,2,"em",17),s.Mb()),2&e){const e=s.Wb(2);s.yb(1),s.Zb("ngForOf",e.post.categories)}}function w(e,t){if(1&e&&s.Jb(0,"img",21),2&e){const e=s.Wb(4);s.Zb("src",e.post.enclosure.thumbnail,s.gc)}}function F(e,t){if(1&e&&(s.Nb(0,"a",19),s.ic(1,w,1,1,"img",20),s.Mb()),2&e){const e=s.Wb(3);s.Zb("href",e.post.enclosure.link,s.gc),s.yb(1),s.Zb("ngIf",e.post.enclosure.thumbnail)}}function Z(e,t){if(1&e&&(s.Nb(0,"div"),s.jc(1),s.Mb()),2&e){const e=s.Wb(3);s.yb(1),s.lc("Type: ",null==e.post.enclosure?null:e.post.enclosure.type,"")}}function W(e,t){if(1&e&&(s.Nb(0,"div"),s.ic(1,F,2,2,"a",18),s.ic(2,Z,2,1,"div",5),s.Mb()),2&e){const e=s.Wb(2);s.yb(1),s.Zb("ngIf",null==e.post.enclosure?null:e.post.enclosure.thumbnail),s.yb(1),s.Zb("ngIf",null==e.post.enclosure?null:e.post.enclosure.type)}}function L(e,t){if(1&e&&(s.Nb(0,"div"),s.jc(1),s.Mb()),2&e){const e=s.Wb(3);s.yb(1),s.lc("Type: ",null==e.post.enclosure?null:e.post.enclosure.type,"")}}function E(e,t){if(1&e&&(s.Nb(0,"div"),s.Jb(1,"img",21),s.ic(2,L,2,1,"div",5),s.Mb()),2&e){const e=s.Wb(2);s.yb(1),s.Zb("src",e.post.enclosure.link,s.gc),s.yb(1),s.Zb("ngIf",null==e.post.enclosure?null:e.post.enclosure.type)}}function R(e,t){if(1&e&&(s.Nb(0,"div"),s.jc(1),s.Mb()),2&e){const e=s.Wb(3);s.yb(1),s.lc("Type: ",null==e.post.enclosure?null:e.post.enclosure.type,"")}}function x(e,t){if(1&e&&(s.Nb(0,"div"),s.jc(1),s.Mb()),2&e){const e=s.Wb(3);s.yb(1),s.lc("Length: ",null==e.post.enclosure?null:e.post.enclosure.length,"")}}function U(e,t){if(1&e&&(s.Nb(0,"div"),s.Nb(1,"a",22),s.jc(2,"Enclosure"),s.Nb(3,"sup"),s.jc(4,"\u2197\ufe0f"),s.Mb(),s.Mb(),s.ic(5,R,2,1,"div",5),s.ic(6,x,2,1,"div",5),s.Mb()),2&e){const e=s.Wb(2);s.yb(1),s.Zb("href",e.post.enclosure.url,s.gc),s.yb(4),s.Zb("ngIf",null==e.post.enclosure?null:e.post.enclosure.type),s.yb(1),s.Zb("ngIf",null==e.post.enclosure?null:e.post.enclosure.length)}}function T(e,t){if(1&e&&(s.Lb(0),s.Jb(1,"hr"),s.Nb(2,"div",13),s.Jb(3,"div",14),s.Xb(4,"sanitizeHtml"),s.Mb(),s.ic(5,O,2,1,"div",15),s.ic(6,W,3,2,"div",5),s.ic(7,E,3,2,"div",5),s.ic(8,U,7,3,"div",5),s.Kb()),2&e){const e=s.Wb();s.yb(3),s.Zb("innerHTML",s.Yb(4,5,e.post.content),s.fc),s.yb(2),s.Zb("ngIf",null==e.post||null==e.post.categories?null:e.post.categories.length),s.yb(1),s.Zb("ngIf",null==e.post.enclosure?null:e.post.enclosure.thumbnail),s.yb(1),s.Zb("ngIf",e.isImage),s.yb(1),s.Zb("ngIf",!(null!=e.post.enclosure&&e.post.enclosure.thumbnail)&&(null==e.post.enclosure?null:e.post.enclosure.url))}}let P=(()=>{class e{constructor(){this.post=new p,this.hidden=!0}get isImage(){var e,t,n;const i=(null===(t=null===(e=this.post)||void 0===e?void 0:e.enclosure)||void 0===t?void 0:t.type)||"";return"image"===(null===(n=null==i?void 0:i.split("/"))||void 0===n?void 0:n[0])}get shortInfo(){return[this.post.author,this.post.pubDate,this.readTime].filter(e=>e).join(", ")}get readTime(){const e=Math.round(this.post.content.toString().length/1500);return e<1?"":`\u23f1 ~${e}m`}}return e.\u0275fac=function(t){return new(t||e)},e.\u0275cmp=s.Cb({type:e,selectors:[["app-post"]],inputs:{post:"post"},decls:10,vars:7,consts:[[1,"post-header"],["class","post-header-thumbnail","alt","thumbnail",3,"src",4,"ngIf"],[1,"post-header-text"],[1,"short-info"],[3,"innerHTML","click",4,"ngIf"],[4,"ngIf"],["class","ml-auto a-button post-button",3,"ngClass","click",4,"ngIf"],["alt","thumbnail",1,"post-header-thumbnail",3,"src"],[3,"innerHTML","click"],["target","_blank",3,"href","innerHTML"],[1,"ml-auto","a-button","post-button",3,"ngClass","click"],["src","assets/expand.svg","alt","Expand post"],["src","assets/unexpand.svg","alt","Unexpand post"],[1,"post-box"],[3,"innerHTML"],["class","small text-muted mb-1",4,"ngIf"],[1,"small","text-muted","mb-1"],[4,"ngFor","ngForOf"],[3,"href",4,"ngIf"],[3,"href"],["alt","thumbnail",3,"src",4,"ngIf"],["alt","thumbnail",3,"src"],["target","_blank",3,"href"]],template:function(e,t){1&e&&(s.Nb(0,"div",0),s.ic(1,v,1,1,"img",1),s.Nb(2,"div",2),s.Nb(3,"small",3),s.jc(4),s.Mb(),s.ic(5,y,2,3,"h3",4),s.ic(6,M,5,4,"h3",5),s.Mb(),s.ic(7,j,3,3,"button",6),s.ic(8,k,2,3,"button",6),s.Mb(),s.ic(9,T,9,7,"ng-container",5)),2&e&&(s.yb(1),s.Zb("ngIf",t.post.thumbnail),s.yb(3),s.lc(" ",t.shortInfo," "),s.yb(1),s.Zb("ngIf",t.hidden),s.yb(1),s.Zb("ngIf",!t.hidden),s.yb(1),s.Zb("ngIf",t.hidden),s.yb(1),s.Zb("ngIf",!t.hidden),s.yb(1),s.Zb("ngIf",!t.hidden))},directives:[g.j,g.h,g.i],pipes:[m],encapsulation:2}),e})();function C(e,t){if(1&e){const e=s.Ob();s.Nb(0,"button",20),s.Ub("click",function(){return s.ec(e),s.Wb(2).removeAllPosts()}),s.jc(1,"Remove all posts"),s.Mb()}}function J(e,t){if(1&e){const e=s.Ob();s.Nb(0,"div",17),s.Nb(1,"button",18),s.Ub("click",function(){return s.ec(e),s.Wb().deleteFeed()}),s.jc(2,"Delete the feed"),s.Mb(),s.ic(3,C,2,0,"button",19),s.Mb()}if(2&e){const e=s.Wb();s.yb(3),s.Zb("ngIf",e.posts.length>0)}}function A(e,t){if(1&e&&(s.Nb(0,"div"),s.Nb(1,"strong",21),s.jc(2,"Title:"),s.Mb(),s.Nb(3,"span"),s.jc(4),s.Mb(),s.Mb()),2&e){const e=s.Wb();s.yb(4),s.kc(e.about.title)}}function D(e,t){if(1&e&&(s.Nb(0,"div"),s.Nb(1,"strong",21),s.jc(2,"Author:"),s.Mb(),s.Nb(3,"span"),s.jc(4),s.Mb(),s.Mb()),2&e){const e=s.Wb();s.yb(4),s.kc(e.about.author)}}function $(e,t){if(1&e&&(s.Nb(0,"div"),s.Nb(1,"strong",21),s.jc(2,"Description:"),s.Mb(),s.Nb(3,"span"),s.jc(4),s.Mb(),s.Mb()),2&e){const e=s.Wb();s.yb(4),s.kc(e.about.description)}}function q(e,t){if(1&e&&(s.Nb(0,"div"),s.Nb(1,"strong",21),s.jc(2,"Link:"),s.Mb(),s.Nb(3,"a",22),s.jc(4),s.Mb(),s.Mb()),2&e){const e=s.Wb();s.yb(3),s.ac("href",e.about.link,s.gc),s.yb(1),s.kc(e.about.link)}}function B(e,t){if(1&e&&(s.Nb(0,"div",23),s.Jb(1,"app-post",24),s.Mb()),2&e){const e=t.$implicit;s.yb(1),s.Zb("post",e)}}function H(e,t){if(1&e){const e=s.Ob();s.Nb(0,"div",25),s.Nb(1,"button",26),s.Ub("click",function(){return s.ec(e),s.Wb().showMore()}),s.jc(2," Show 10 more posts "),s.Mb(),s.Mb()}}const z=function(e){return{"active-actions":e}};let _=(()=>{class e{constructor(e,t,n){this.dbService=e,this.router=t,this.route=n,this.posts=[],this.displayActions=!1,this.viewCount=10,this.about=new l,this.identify=(e,t)=>t.id}get viewPosts(){return this.posts.slice(0,this.viewCount)}showMore(){this.viewCount+=10}markAsReadFeed(e){this.dbService.update(h.FEEDS,Object.assign(Object.assign({},e),{newCount:0})).subscribe()}markAsReadPosts(){const e=this.posts.filter(e=>e.isNew).map(e=>this.dbService.update(h.POSTS,Object.assign(Object.assign({},e),{isNew:!1})));Object(f.a)(...e).pipe(Object(c.a)()).subscribe()}deleteTail(){const e=this.posts.slice(99).map(e=>this.dbService.delete(h.POSTS,e.id));Object(f.a)(...e).pipe(Object(c.a)()).subscribe()}ngOnInit(){this.route.params.pipe(Object(r.a)(e=>e.id),Object(a.a)(e=>this.feedId=+e),Object(u.a)(e=>this.dbService.getByID(h.FEEDS,+e)),Object(a.a)(e=>{this.markAsReadFeed(e),this.about=e.about}),Object(u.a)(e=>this.dbService.getAllByIndex(h.POSTS,"feedId",IDBKeyRange.only(this.feedId))),Object(a.a)(e=>this.posts=(null==e?void 0:e.reverse())||[]),Object(d.a)(200),Object(a.a)(()=>this.markAsReadPosts()),Object(d.a)(200),Object(a.a)(()=>this.deleteTail())).subscribe()}deleteFeed(){if(!0===confirm("Remove the feed?")){const e=[this.dbService.delete(h.FEEDS,this.feedId),...this.posts.map(e=>this.dbService.delete(h.POSTS,e.id))];Object(f.a)(...e).pipe(Object(c.a)()).subscribe(()=>this.router.navigate(["/"]))}}removeAllPosts(){if(!0===confirm("Remove all the posts?")){const e=this.posts.map(e=>this.dbService.delete(h.POSTS,e.id));Object(f.a)(...e).pipe(Object(c.a)()).subscribe(()=>this.ngOnInit())}}}return e.\u0275fac=function(t){return new(t||e)(s.Ib(o.b),s.Ib(b.b),s.Ib(b.a))},e.\u0275cmp=s.Cb({type:e,selectors:[["app-feed"]],decls:26,vars:12,consts:[[3,"ngClass"],[1,"container"],[1,"p-1"],[1,"top-top-feed"],[1,"a-button","lh-20",3,"click"],["routerLink","/",1,"ml-auto"],["width","16","src","assets/back.svg","alt","Back to feeds"],["class","mb-2 mt-1",4,"ngIf"],[1,"w-100"],[1,"feed-image"],["onerror","this.src='assets/icon-72x72.png'","alt","image",3,"src"],[1,"feed-about"],[4,"ngIf"],["class","post-wrapper",4,"ngFor","ngForOf","ngForTrackBy"],["class","feed-line p-1 pb-2",4,"ngIf"],[1,"bottom-box"],["src","assets/favicon-32x32.png"],[1,"mb-2","mt-1"],[1,"a-button","red","lh-20","mr-1",3,"click"],["class","a-button red lh-20",3,"click",4,"ngIf"],[1,"a-button","red","lh-20",3,"click"],[1,"mr-1"],["target","_blank",3,"href"],[1,"post-wrapper"],[3,"post"],[1,"feed-line","p-1","pb-2"],[1,"ml-auto","a-button","mr-auto",3,"click"]],template:function(e,t){1&e&&(s.Nb(0,"div",0),s.Nb(1,"div",1),s.Nb(2,"div",2),s.Nb(3,"div",3),s.Nb(4,"button",4),s.Ub("click",function(){return t.displayActions=!t.displayActions}),s.jc(5,"\u2699"),s.Mb(),s.Nb(6,"a",5),s.Jb(7,"img",6),s.jc(8," Back to feeds "),s.Mb(),s.Mb(),s.ic(9,J,4,1,"div",7),s.Mb(),s.Mb(),s.Mb(),s.Nb(10,"div",1),s.Nb(11,"table",8),s.Nb(12,"tbody"),s.Nb(13,"tr"),s.Nb(14,"td",9),s.Jb(15,"img",10),s.Mb(),s.Nb(16,"td",11),s.ic(17,A,5,1,"div",12),s.ic(18,D,5,1,"div",12),s.ic(19,$,5,1,"div",12),s.ic(20,q,5,2,"div",12),s.Mb(),s.Mb(),s.Mb(),s.Mb(),s.ic(21,B,2,1,"div",13),s.ic(22,H,3,0,"div",14),s.Jb(23,"hr"),s.Nb(24,"div",15),s.Jb(25,"img",16),s.Mb(),s.Mb()),2&e&&(s.Zb("ngClass",s.cc(10,z,t.displayActions)),s.yb(9),s.Zb("ngIf",t.displayActions),s.yb(6),s.Zb("src",t.about.image||"assets/icon-72x72.png",s.gc),s.yb(2),s.Zb("ngIf",t.about.title),s.yb(1),s.Zb("ngIf",t.about.author),s.yb(1),s.Zb("ngIf",t.about.description),s.yb(1),s.Zb("ngIf",t.about.link),s.yb(1),s.Zb("ngForOf",t.viewPosts)("ngForTrackBy",t.identify),s.yb(1),s.Zb("ngIf",t.viewCount<t.posts.length))},directives:[g.h,b.d,g.j,g.i,P],encapsulation:2}),e})();var X=n("XNiG"),G=n("itXk"),K=n("1G5W"),V=n("2Vo4"),Y=n("LRne"),Q=n("JIr8"),ee=n("tk/3");let te=(()=>{class e{constructor(e,t){this.http=e,this.dbService=t,this.feedLoading$=new V.a({}),this.feedError$=new V.a({})}setFeedLoading(e,t){const n=this.feedLoading$.getValue();this.feedLoading$.next(Object.assign(Object.assign({},n),{[e]:t}))}setFeedError(e,t){const n=this.feedError$.getValue();this.feedError$.next(Object.assign(Object.assign({},n),{[e]:t}))}updateFeed(e,t,n){this.dbService.update(h.FEEDS,{url:e,id:t,about:n})}addPosts(e,t,n,i){Object(G.a)(e.map(e=>this.dbService.add(h.POSTS,Object.assign(Object.assign({},e),{feedId:t,isNew:!0})).pipe(Object(Q.a)(()=>Object(Y.a)(-1))))).pipe(Object(u.a)(()=>this.dbService.getAllByIndex(h.POSTS,"feedId",IDBKeyRange.only(t))),Object(r.a)(e=>[e.length,e.filter(e=>e.isNew).length]),Object(r.a)(([e,s])=>({url:n,id:t,about:i,count:e,newCount:s}))).subscribe(e=>this.dbService.update(h.FEEDS,e))}getNewPostsAndUpdateStore(e,t){return this.setFeedLoading(t,!0),this.http.get(encodeURI(`https://api.rss2json.com/v1/api.json?rss_url=${e}`)).pipe(Object(a.a)(n=>{this.addPosts(n.items.reverse(),t,e,n.feed),this.setFeedLoading(t,!1)}),Object(Q.a)(e=>(this.setFeedLoading(t,!1),this.setFeedError(t,e.message||"Error"),Object(Y.a)(null))))}refreshFeeds(e){const t=e.map(e=>this.getNewPostsAndUpdateStore(e.url,e.id));return Object(f.a)(...t).pipe(Object(c.a)())}}return e.\u0275fac=function(t){return new(t||e)(s.Rb(ee.a),s.Rb(o.b))},e.\u0275prov=s.Eb({token:e,factory:e.\u0275fac,providedIn:"root"}),e})();var ne=n("3Pt+");function ie(e,t){if(1&e){const e=s.Ob();s.Nb(0,"button",23),s.Ub("click",function(){return s.ec(e),s.Wb().share()}),s.Jb(1,"img",24),s.Mb()}}function se(e,t){1&e&&s.Jb(0,"span",25)}function oe(e,t){if(1&e&&(s.Nb(0,"div",33),s.Nb(1,"small"),s.jc(2),s.Mb(),s.Mb()),2&e){const e=s.Wb().$implicit,t=s.Wb();s.yb(2),s.lc("\ud83d\udca2 ",t.feedError[e.id],"")}}function be(e,t){1&e&&s.Jb(0,"span",25)}function ce(e,t){if(1&e&&(s.Nb(0,"sup",35),s.jc(1),s.Mb()),2&e){const e=s.Wb(2).$implicit;s.yb(1),s.lc(" +",e.newCount," ")}}function re(e,t){if(1&e&&(s.Nb(0,"span"),s.ic(1,ce,2,1,"sup",34),s.jc(2),s.Mb()),2&e){const e=s.Wb().$implicit;s.yb(1),s.Zb("ngIf",e.newCount),s.yb(1),s.lc(" ",e.count||"-"," ")}}const ae=function(e){return{loading:e}},ue=function(e){return["/",e]};function de(e,t){if(1&e&&(s.Nb(0,"div",26),s.Nb(1,"div",27),s.Nb(2,"strong",28),s.jc(3),s.Mb(),s.Jb(4,"br"),s.Nb(5,"small",28),s.jc(6),s.Mb(),s.ic(7,oe,3,1,"div",29),s.Mb(),s.Nb(8,"div",30),s.Nb(9,"button",31),s.ic(10,be,1,0,"span",10),s.ic(11,re,3,2,"span",32),s.Mb(),s.Mb(),s.Mb()),2&e){const e=t.$implicit,n=s.Wb();s.Zb("ngClass",s.cc(8,ae,n.feedLoading[e.id])),s.yb(3),s.kc((null==e.about?null:e.about.title)||"noname"),s.yb(3),s.kc(e.url),s.yb(1),s.Zb("ngIf",n.feedError[e.id]),s.yb(2),s.Zb("disabled",n.feedLoading[e.id])("routerLink",s.cc(10,ue,e.id)),s.yb(1),s.Zb("ngIf",n.feedLoading[e.id]),s.yb(1),s.Zb("ngIf",!n.feedLoading[e.id])}}function le(e,t){if(1&e){const e=s.Ob();s.Nb(0,"div",36),s.Nb(1,"button",37),s.Ub("click",function(){return s.ec(e),s.Wb().addFeedMode=!0}),s.jc(2,"+ add"),s.Mb(),s.Mb()}}const pe=function(){return["https://example.com/feed1\nhttps://example.com/feed2"]};function fe(e,t){if(1&e){const e=s.Ob();s.Nb(0,"form",38),s.Nb(1,"fieldset"),s.Nb(2,"label",39),s.jc(3,"Enter new feed URLs"),s.Mb(),s.Nb(4,"textarea",40),s.Ub("ngModelChange",function(t){return s.ec(e),s.Wb().rawFeedURLs=t}),s.Mb(),s.Nb(5,"button",41),s.Ub("click",function(){s.ec(e);const t=s.Wb();return t.addFeeds(t.rawFeedURLs)}),s.jc(6,"Add to the feeds"),s.Mb(),s.Mb(),s.Mb()}if(2&e){const e=s.Wb();s.yb(4),s.Zb("ngModel",e.rawFeedURLs)("placeholder",s.bc(2,pe))}}function he(e,t){if(1&e){const e=s.Ob();s.Nb(0,"button",42),s.Ub("click",function(){return s.ec(e),s.Wb().unregister()}),s.jc(1,"Unregister SW"),s.Mb()}}const ge=[{path:":id",component:_},{path:"",component:(()=>{class e{constructor(e,t){this.dbService=e,this.coreService=t,this.feeds=[],this.addFeedMode=!1,this.godMode=!1,this.rawFeedURLs="",this.feedLoading={},this.feedError={},this.loading=!1,this.ngUnsubscribe$=new X.a,this.identify=(e,t)=>t.id}get shareIsSuported(){return!!navigator.share}addFeeds(e){this.addFeedMode=!1,this.rawFeedURLs="";const t=e.split("\n").map(e=>e.trim()).filter(e=>e).filter(e=>(e=>{let t;try{t=new URL(e)}catch(n){return!1}return"http:"===t.protocol||"https:"===t.protocol})(e)).map(e=>this.dbService.add(h.FEEDS,{url:e}));Object(G.a)(t).subscribe(()=>this.load())}refreshFeeds(){this.loading=!0,this.feedError={},this.coreService.refreshFeeds(this.feeds).subscribe(()=>{this.loading=!1,this.load()})}share(){var e;null===(e=navigator.share)||void 0===e||e.call(navigator,{title:"Stupid RSS",text:this.feeds.map(e=>e.url).join(" \n"),url:location.href})}load(){this.dbService.getAll(h.FEEDS).subscribe(e=>this.feeds=e)}ngOnInit(){this.coreService.feedLoading$.pipe(Object(K.a)(this.ngUnsubscribe$)).subscribe(e=>{this.feedLoading=e,this.load()}),this.coreService.feedError$.pipe(Object(K.a)(this.ngUnsubscribe$)).subscribe(e=>{this.feedError=e,this.load()}),this.load();try{this.addFeeds(function(){const e=localStorage.getItem("feedList");localStorage.removeItem("feedList");try{return JSON.parse(e).join("\n")}catch(t){return""}}())}catch(e){}}unregister(){var e;!0===confirm("Unregister the Service Worker?")&&(null===(e=navigator.serviceWorker)||void 0===e||e.getRegistrations().then(e=>{for(const t of e)t.unregister()}))}ngOnDestroy(){this.ngUnsubscribe$.next(),this.ngUnsubscribe$.complete()}}return e.\u0275fac=function(t){return new(t||e)(s.Ib(o.b),s.Ib(te))},e.\u0275cmp=s.Cb({type:e,selectors:[["app-home"]],decls:66,vars:8,consts:[[1,"container","mb-3","mt-3"],[1,"w-100"],["routerLink","/"],["alt","Stupid RSS Reader logo","src","assets/fur-boot-green.svg",2,"width","5rem"],[1,"ml-2","app-name"],[1,"container","p-1","mb-2",2,"background-color","rgba(255,248,220,0.5)"],[1,"feeds-header"],[1,"mr-auto"],["class","a-button button-share mr-1",3,"click",4,"ngIf"],[1,"a-button","green",3,"disabled","click"],["class","spinner",4,"ngIf"],["class","feed-line",3,"ngClass",4,"ngFor","ngForOf","ngForTrackBy"],["class","mt-1",4,"ngIf"],["class","pure-form pure-form-stacked",4,"ngIf"],[1,"container","p-1","mb-2",2,"background-color","rgba(255,235,205,0.5)"],["href","https://rss2json.com/","target","_blank"],["href","https://developers.google.com/web/progressive-web-apps/","target","_blank"],["href","https://developer.mozilla.org/ru/docs/Web/API/IndexedDB_API","target","_blank"],["href","https://github.com/gurov/stupid-rss-reader","target","_blank"],[1,"container","p-1","mb-2",2,"background-color","rgba(255,250,240,0.5)"],[1,"bottom-box"],["src","assets/favicon-32x32.png",3,"click"],["class","a-button red ml-1 lh-20",3,"click",4,"ngIf"],[1,"a-button","button-share","mr-1",3,"click"],["src","assets/share.svg","alt","Share feeds"],[1,"spinner"],[1,"feed-line",3,"ngClass"],[1,"mr-1"],[1,"fit-text"],["style","color: #82280c","class","fit-text",4,"ngIf"],[1,"ml-auto",2,"text-align","right"],[1,"a-button","button-counter",3,"disabled","routerLink"],[4,"ngIf"],[1,"fit-text",2,"color","#82280c"],["class","new-info",4,"ngIf"],[1,"new-info"],[1,"mt-1"],[1,"a-button","lh-20",3,"click"],[1,"pure-form","pure-form-stacked"],["for","new-feeds"],["name","rawFeedURLs","id","new-feeds",1,"pure-input-1",3,"ngModel","placeholder","ngModelChange"],["type","button",1,"a-button","lh-20",3,"click"],[1,"a-button","red","ml-1","lh-20",3,"click"]],template:function(e,t){1&e&&(s.Nb(0,"div",0),s.Nb(1,"table",1),s.Nb(2,"tbody"),s.Nb(3,"tr"),s.Nb(4,"td"),s.Nb(5,"a",2),s.Jb(6,"img",3),s.Mb(),s.Mb(),s.Nb(7,"td"),s.Nb(8,"h1",4),s.jc(9,"Stupid RSS Reader"),s.Mb(),s.Mb(),s.Mb(),s.Mb(),s.Mb(),s.Mb(),s.Nb(10,"div",5),s.Nb(11,"div",6),s.Nb(12,"h2",7),s.jc(13,"Feeds"),s.Mb(),s.ic(14,ie,2,0,"button",8),s.Nb(15,"button",9),s.Ub("click",function(){return t.refreshFeeds()}),s.jc(16," Refresh all feeds "),s.ic(17,se,1,0,"span",10),s.Mb(),s.Mb(),s.ic(18,de,12,12,"div",11),s.ic(19,le,3,0,"div",12),s.Nb(20,"div"),s.ic(21,fe,7,3,"form",13),s.Mb(),s.Mb(),s.Nb(22,"div",14),s.Nb(23,"h3"),s.jc(24,"About"),s.Mb(),s.Nb(25,"p"),s.jc(26,"I'm tired of different stupid RSS clients and I created own Stupid RSS Reader."),s.Mb(),s.Nb(27,"h4"),s.jc(28,"Proxy for RSS"),s.Mb(),s.Nb(29,"p"),s.jc(30," The application must use the proxy "),s.Nb(31,"a",15),s.jc(32,"rss2json.com"),s.Mb(),s.jc(33," because CORS restrictions on cross-site requests. "),s.Mb(),s.Nb(34,"h4"),s.jc(35,"Features"),s.Mb(),s.Nb(36,"ul"),s.Nb(37,"li"),s.jc(38,"Stupid RSS is "),s.Nb(39,"a",16),s.jc(40,"Progressive Web App"),s.Mb(),s.Mb(),s.Nb(41,"li"),s.jc(42,"You can install it to your smartphone"),s.Mb(),s.Nb(43,"li"),s.jc(44,"Very simple interface"),s.Mb(),s.Nb(45,"li"),s.jc(46,"Offline mode"),s.Mb(),s.Nb(47,"li"),s.jc(48,"All user data are stored locally only ("),s.Nb(49,"a",17),s.jc(50,"IndexedDB"),s.Mb(),s.jc(51,")"),s.Mb(),s.Nb(52,"li"),s.jc(53,"The last 99 posts are stored. Deletion occurs after downloading new ones"),s.Mb(),s.Nb(54,"li"),s.jc(55,"Open source: "),s.Nb(56,"a",18),s.jc(57,"Github"),s.Mb(),s.Mb(),s.Mb(),s.Mb(),s.Nb(58,"div",19),s.Nb(59,"h3"),s.jc(60,"Philosophy"),s.Mb(),s.Nb(61,"p"),s.jc(62,"The application does not impose anything, but only executes orders."),s.Mb(),s.Mb(),s.Nb(63,"div",20),s.Nb(64,"img",21),s.Ub("click",function(){return t.godMode=!t.godMode}),s.Mb(),s.ic(65,he,2,0,"button",22),s.Mb()),2&e&&(s.yb(14),s.Zb("ngIf",t.shareIsSuported),s.yb(1),s.Zb("disabled",t.loading),s.yb(2),s.Zb("ngIf",t.loading),s.yb(1),s.Zb("ngForOf",t.feeds)("ngForTrackBy",t.identify),s.yb(1),s.Zb("ngIf",!t.addFeedMode),s.yb(2),s.Zb("ngIf",t.addFeedMode),s.yb(44),s.Zb("ngIf",t.godMode))},directives:[b.d,g.j,g.i,g.h,b.c,ne.g,ne.d,ne.e,ne.a,ne.c,ne.f],encapsulation:2}),e})()}];let me=(()=>{class e{}return e.\u0275fac=function(t){return new(t||e)},e.\u0275mod=s.Gb({type:e}),e.\u0275inj=s.Fb({imports:[[b.e.forRoot(ge,{useHash:!0})],b.e]}),e})(),ve=(()=>{class e{constructor(){this.title="stupid-rss-reader"}}return e.\u0275fac=function(t){return new(t||e)},e.\u0275cmp=s.Cb({type:e,selectors:[["app-root"]],decls:2,vars:0,template:function(e,t){1&e&&(s.Nb(0,"div"),s.Jb(1,"router-outlet"),s.Mb())},directives:[b.f],styles:[""]}),e})();var ye=n("Jho9");const Me={name:"Stupid-RSS-Reader",version:2,objectStoresMeta:[{store:h.POSTS,storeConfig:{keyPath:"id",autoIncrement:!0},storeSchema:[{name:"title",keypath:"title",options:{unique:!1}},{name:"feedId",keypath:"feedId",options:{unique:!1}},{name:"pubDate",keypath:"pubDate",options:{unique:!1}},{name:"link",keypath:"link",options:{unique:!1}},{name:"guid",keypath:"guid",options:{unique:!0}},{name:"author",keypath:"author",options:{unique:!1}},{name:"thumbnail",keypath:"thumbnail",options:{unique:!1}},{name:"description",keypath:"description",options:{unique:!1}},{name:"content",keypath:"content",options:{unique:!1}},{name:"categories",keypath:"categories",options:{unique:!1}},{name:"enclosure",keypath:"enclosure",options:{unique:!1}},{name:"isNew",keypath:"isNew",options:{unique:!1}}]},{store:h.FEEDS,storeConfig:{keyPath:"id",autoIncrement:!0},storeSchema:[{name:"url",keypath:"url",options:{unique:!0}},{name:"about",keypath:"about",options:{unique:!1}},{name:"newCount",keypath:"newCount",options:{unique:!1}},{name:"count",keypath:"count",options:{unique:!1}}]}],migrationFactory:function(){return{2:(e,t)=>{const n=t.objectStore(h.FEEDS);n.createIndex("newPostIds","newPostIds",{unique:!1}),n.createIndex("postIds","postIds",{unique:!1})}}}};let Ne=(()=>{class e{}return e.\u0275fac=function(t){return new(t||e)},e.\u0275mod=s.Gb({type:e,bootstrap:[ve]}),e.\u0275inj=s.Fb({providers:[],imports:[[i.a,ne.b,ee.b,b.e,me,o.a.forRoot(Me),ye.a.register("/stupid-rss-reader/ngsw-worker.js",{enabled:!0})]]}),e})();Object(s.S)(),i.c().bootstrapModule(Ne).catch(e=>console.error(e))},zn8P:function(e,t){function n(e){return Promise.resolve().then(function(){var t=new Error("Cannot find module '"+e+"'");throw t.code="MODULE_NOT_FOUND",t})}n.keys=function(){return[]},n.resolve=n,e.exports=n,n.id="zn8P"}},[[0,0,4]]]);
//# sourceMappingURL=main.72db1674d37ffd41e716.js.map