// Sets up an interactive timeline using d3.js and d3-tip.js

let fullscreenElem = (elem) => {
    let evt = this.event;
    console.log(evt, elem);

    if (evt.target.classList.contains('active')) {
        elem.parentNode.style.height = "initial";
        elem.parentNode.style.width = "initial";
        window.scroll(0, 0);
        evt.target.classList.remove('active');
        evt.target.innerHTML = "Fullscreen";
    } else {
        elem.parentNode.style.height = "100vh";
        elem.parentNode.style.width = "100vw";
        window.scroll(0, elem.getBoundingClientRect().top);
        evt.target.classList.add('active');
        evt.target.innerHTML = "Normal View";
    }
    
};

window.addEventListener('load', () => {
    // viewBox dimensions - svg's actual width & height set in css
    let width = 1000;
    let height = 200;
    let margin = width*.05;

    // add event listener to fullscreen button
    document.getElementById('timeline-btn--fullscreen').addEventListener('click', fullscreenElem.bind(this, document.getElementById('timeline')));

    // helper functions
    let parseTime = d3.timeParse('%b/%d/%y');

    // set range of time scale equal to viewBox
    let timeScale = d3.scaleTime()
                      .range([0, width - margin*2]);
    // declare colorScale globally
    let colorScale = d3.scaleOrdinal();

    // imported d3-tip, sets up tooltip creation function to apply later
    let tip = d3.tip()
                .attr('class', 'd3-tip')
                .html((d) => { 
                    return `<p class='tip--date'>${d.date.toDateString()}</p>
                            <p class='tip--name'>${d.name}</p>
                            `;
                });

    // update timeline on filter button click
    let updateTimeline = (e) => {
        let category = e.target.id.replace("category-toggle--", "");

        // grab all filter buttons to highlight selected only
        let filterBtns = document.querySelectorAll('.cat-filters--item.active');
        for (let j=0; j<filterBtns.length; j++) { 
            filterBtns[j].classList.remove('active');
        }
        e.target.parentNode.classList.add('active'); // the label, not radio btn, is what we see, thus .parentNode

        // grab all timeline events, hide ones not in the selected category reveal the rest.
        let circles = document.querySelectorAll('.time-event');
        for (let i=0; i<circles.length; i++) {
            if (category==="all" || circles[i].classList.contains(category)) {
                circles[i].classList.remove('inactive');
            } else {
                if (!circles[i].classList.contains('inactive')) circles[i].classList.add('inactive');
            }
        }
    }

    // create a nav with one filtering radio button input for each timeline event category
    let createCatNav = (cats, elem) => {
        let catToggles = document.createElement('nav');
        catToggles.id = 'cat-filters';
        cats.unshift('all');
        
        cats.forEach((cat) => {
            let label = document.createElement('label');
            label.classList.add('cat-filters--item');
            label.style.borderColor = (cat==='all') ? 'black' : colorScale(cat);
            label.style.borderStyle = "solid";
            label.style.borderWidth = "2px";
            label.innerHTML = cat;
            let radio = document.createElement('input');
            radio.type = "radio";
            radio.name = "category-toggle";
            radio.id = "category-toggle--" + cat;
            label.for = radio.id;
            label.appendChild(radio);
            catToggles.appendChild(label);
            label.addEventListener('click', updateTimeline);
        });

        elem.appendChild(catToggles, elem.nextSibling);
    };

    // set up d3 timeline
    let svg = d3.select('#timeline')
                .attr('viewBox', `0 0 ${width} ${height}`)
                .call(d3.zoom().on("zoom", function () {    // makes timeline zoomable
                    svg.attr("transform", `translate(${d3.event.transform.x},0) scale(${ d3.event.transform.k })`);
                    svg.selectAll("circle").attr('r', Math.max(3-(d3.event.transform.k-1)/6, 1)); // applies additional scaling circles on zoom
                 }))
                 .append("g")
                 .attr('transform', `translate(${margin} 0)`)
                 .attr('transform-origin', `${width/2}px ${height/2}px`)
                 .call(tip);
    
    // get csv data
    d3.csv(baseurl+"/assets/iridium-timline_event-data.csv", (err, data) => {
        if (err) throw err;

        data.forEach(item => item.date = new Date(item.date)); // make date attr a proper Date object
        let sorted = data.sort((a, b) => a.date.getTime() - b.date.getTime()); // sort data by date attr
         
        // give timeScale domain based on data's extent
        const yrPad = 1;
        let timeExt = [new Date(sorted[0].date.getFullYear() - yrPad,0,1), new Date(sorted[sorted.length-1].date.getFullYear() + yrPad,0,1)]
        timeScale.domain(timeExt);

        // filter category column in data to only unique values
        let uniqueCats = sorted.map(item => item.category).filter((item, i, self) => self.indexOf(item) === i);
        // set up domain and range of colorScale based on category values
        colorScale.domain(uniqueCats)
                  .range(uniqueCats.map((cat, i) => d3.hsl(i*360/(uniqueCats.length), .9, .75)));
        createCatNav(uniqueCats, document.getElementById('timeline--section'));

        // add timeline axis
        svg.append('g')
           .attr('transform', `translate(0,${ height / 2 })`)
           .call(d3.axisBottom(timeScale));

        // add group to put timeline events in
        let events = svg.append('g')
                         .attr('id', 'timeline-events--group');

        // add circles for each timeline event
        let evtGs = events.selectAll('g')
                            .data(sorted)
                            .enter()
                            .append('g')
                            .attr('id', (d,i) => 'time-event--' + i);
        
        const vUnit = 18; // unit length of timeline arm

        // gets a y value for line or circle of a timeline event
        // moves further out from the timeline center based on crowdedness
        function getY(d,i,type) {
            let vShift = 0;
            let flip = (i%2-.5)*2;
            let h = height/2 + flip*vUnit;
            let compEl = d3.select(`#${type}${i-2}`);

                if (i>=2) {
                    let attr = (type == "circ--") ? ["cx", "cy"] : ["x2", "y2"];
                    if (Math.abs(timeScale(d.date) - compEl.attr(attr[0])) < radius*2) {
                        vShift = 1;
                        while(Math.abs(h+flip*vShift*vUnit - compEl.attr(attr[1])) < radius*2) { vShift++; }
                    }
                }

                h += flip*vShift*vUnit;
            return h;
        }

        let cY = 0;
        const radius = 3;
        evtGs.append('line')
             .attr('id', (d,i) => 'line--'+i)
             .attr('x1', d => timeScale(d.date))
             .attr('y1', height / 2)
             .attr('x2', d => timeScale(d.date))
             .attr('y2', (d,i) => getY(d,i, 'line--'))
             .attr('stroke', d => colorScale(d.category))
             .attr('class', d => d.category + " time-event");

        evtGs.append('circle')
            .attr('id', (d,i) => 'circ--'+i)
            .attr('r', radius)
            .attr('cx', d => timeScale(d.date))
            .attr('cy', (d,i) => getY(d,i, 'circ--'))
            .attr('stroke', (d,i) => (d.featured === 'y') ? "black" : "none")
            .attr('fill', d => colorScale(d.category))
            .attr('class', d => d.category + " time-event")
            .attr('transform-origin', d => `${timeScale(d.date)}px ${height/2}`)
            .on('mouseover', tip.show)
            .on('mouseout', tip.hide);
    });
});