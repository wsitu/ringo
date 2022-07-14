const ringo = {};
(()=>{ //======================================================================
//=============================================================================


ringo.WElement = class {
    /* Base class for objects that create an HTML element then wrap data and
    other functionality along with it.
    
    rootElement | the HTML element created by the constructor
    */
    

    /* <elConfig> element config with the following keys
           tag:  (required) string of the type of html element to return
           attr: (optional) object representing html attribute: value
           text: (optional) string of the text content (not tml)
           html: (optional) string of the html content (overwrites text)
    */
    constructor(elConfig = {tag: "div", attr: {}, html: "", text: ""}) {
        let e = document.createElement(elConfig.tag);
        if (elConfig.text) e.textContent = elConfig.text;
        if (elConfig.html) e.innerHTML = elConfig.html;
        let attributes = elConfig.attr || {};
        for (const [key, value] of Object.entries(attributes))
            e.setAttribute(key, value);
        this.rootElement = e;
    }
    
    // Appends this object as the last child to parentEl
    addTo(parentEl) {
        let node = parentEl instanceof Node ? parentEl : parentEl.rootElement;
        node.appendChild(this.rootElement);
    }
    
    // Appends childEl to this object as the last child
    addChild(childEl) {
        let node = childEl instanceof Node ? childEl : childEl.rootElement;
        this.rootElement.appendChild(node);
    }
}


//=============================================================================
})(); //=======================================================================