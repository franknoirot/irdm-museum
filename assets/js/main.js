window.addEventListener('load', () => {
    let width = 1000;
    let height = 200;

    let parseTime = d3.timeParse('%b/%d/%y');

    let timeScale = d3.scaleTime()
                      .range([0, width]);
    let colorScale = d3.scaleOrdinal()
                       .range([d3.hsl(0, .7, .5),d3.hsl(360, .7, .5)]);

    let tip = d3.tip()
                .attr('class', 'd3-tip')
                .html((d) => { 
                    return `<p class='tip--date'>${d.date.toDateString()}</p>
                            <p class='tip--name'>${d.name}</p>
                            `;
                });

    let updateTimeline = (e) => {
        let category = e.target.innerHTML;
        let circles = document.querySelector('.time-event');

        for (let i=0; i<circles.length; i++) {
            if (circles[i].classList.contains(category)) {
                circles[i].classList.remove('inactive');
            } else {
                if (!circles[i].classList.contains('inactive')) circles[i].classList.add('inactive');
            }
        }
    }

    let createCatNav = (cats, elem) => {
        let catToggles = document.createElement('nav');
        
        cats.forEach((cat) => {
            let label = document.createElement('label');
            label.innerHTML = cat;
            let radio = document.createElement('input');
            radio.type = "radio";
            radio.id = "category-toggle--" + cat;
            label.for = radio.id;
            label.appendChild(radio);
            catToggles.appendChild(label);
            label.addEventListener('click', updateTimeline);
        });

        elem.parentNode.insertBefore(catToggles, elem.nextSibling);

    };


    let svg = d3.select('#timeline')
                .attr('viewBox', `0 0 ${width} ${height}`)
                .call(d3.zoom().on("zoom", function () {
                    svg.attr("transform", `translate(${d3.event.transform.x},0) scale(${ d3.event.transform.k })`);
                    svg.selectAll("circle").attr('r', Math.max(3-(d3.event.transform.k-1)/6, 1));
                 }))
                 .append("g")
                 .attr('transform-origin', `${width/2}px ${height/2}px`)
                 .call(tip);
    
    d3.csv(baseurl+"/assets/iridium-timline_event-data.csv", (err, data) => {
        if (err) throw err;

        data.forEach(item => item.date = new Date(item.date)); // make date attr a proper Date object
        // sort data by each one's date attr
        let sorted = data.sort((a, b) => a.date.getTime() - b.date.getTime());
         
        
        timeScale.domain(d3.extent(sorted, item => item.date));
        let uniqueCats = sorted.map(item => item.category).filter((item, i, self) => self.indexOf(item) === i);
        colorScale.domain(uniqueCats);
        console.log(uniqueCats);
        // createCatNav(uniqueCats, document.getElementById('timeline--section'));

        svg.append('g')
           .attr('transform', `translate(0,${ height / 2 })`)
           .call(d3.axisBottom(timeScale));

        let circles = svg.append('g')
                         .attr('id', 'timeline-events--group');

        circles.selectAll('dot')
            .data(sorted)
            .enter().append('circle')
            .attr('r', 3)
            .attr('cx', d => timeScale(d.date))
            .attr('cy', height / 2)
            .attr('fill', d => colorScale(d.category))
            .attr('class', d => d.category + " time-event")
            .attr('transform-origin', d => `${timeScale(d.date)}px ${height/2}`)
            .on('mouseover', tip.show)
            .on('mouseout', tip.hide);
    });
});