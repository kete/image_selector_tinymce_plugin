
<h2 class="result-title">Title: {{result_title}}</h2>
<h2 class="result-author">by <a href="{{result_author_url}}" target="_blank">{{result_author_name}}</a></h2>

<h1 class="result-size-choice-headline">Choose a size</h1>

<ul id="result-sizes">
{{#sizes}}
<li class="size-choice" id=result-sizes-{{size_name}}>
<img src="{{url}}" width="{{width}}" height="{{height}}" class="result-size-image">
<div class="size-name"><a href=#/selections/{{oembed_url}} class="result-size-choose">{{size_name}}</a></div>
</li>
{{/sizes}}
</ul>

<div id="home-link"><a href="index.html">Back to Sources</a></div>