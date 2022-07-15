const ringo = {};
(()=>{ //======================================================================
//=============================================================================


ringo.WElement = class {
    /* Base class for objects that create an HTML element then wrap data and
    other functionality along with it. See this.createEl() for elConfig info.
    
    rootElement | the HTML element created by the constructor
    */
    constructor(elConfig = {tag: "div", attr: {}, html: "", text: ""}) {
        this.root = this.createEl(elConfig);
    }

    // Appends this object as the last child to parentEl
    addTo(parentEl) {
        let node = parentEl instanceof Node ? parentEl : parentEl.root;
        node.appendChild(this.root);
    }
    
    // Appends childEl to this object as the last child
    addChild(childEl) {
        let node = childEl instanceof Node ? childEl : childEl.root;
        this.root.appendChild(node);
    }
    
    /* Returns an element of the given tag, attribute, and content
       <elConfig> element config with the following keys
           tag:  (required) string of the type of html element to return
           attr: (optional) object representing html attribute: value
           text: (optional) string of the text content (not tml)
           html: (optional) string of the html content (overwrites text)
    */
    createEl(elConfig = {tag: "div", attr: {}, html: "", text: ""}) {
        let e = document.createElement(elConfig.tag);
        if (elConfig.text) e.textContent = elConfig.text;
        if (elConfig.html) e.innerHTML = elConfig.html;
        let attributes = elConfig.attr || {};
        for (const [key, value] of Object.entries(attributes))
            e.setAttribute(key, value);
        return e;
    }
}


//=============================================================================
})(); //=======================================================================