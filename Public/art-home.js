/* Progressive enhancement: public content remains visible without JavaScript. */
(()=>{
 const home=document.querySelector('.art-home');
 if(!home||!('IntersectionObserver' in window)||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const nodes=[...home.querySelectorAll('.art-reveal')];
 document.documentElement.classList.add('art-motion');
 const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.removeAttribute('data-enter');observer.unobserve(entry.target);}},{threshold:.06,rootMargin:'0px 0px 40px 0px'});
 for(const node of nodes){if(node.getBoundingClientRect().top>innerHeight){node.dataset.enter='waiting';observer.observe(node);}}
 // Avoid leaving content hidden if a later browser/script error interrupts observation.
 window.addEventListener('beforeprint',()=>nodes.forEach(node=>node.removeAttribute('data-enter')));
})();
