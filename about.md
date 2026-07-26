---
title: About
layout: default
nav_key: about
description: About Gavin's research practice, methods, and interests.
---
<header class="page-hero page-hero--about">
  <canvas class="page-hero__field" data-mini-flock aria-hidden="true"></canvas>
  <div class="shell page-hero__content reveal">
    <p class="section__eyebrow">About this practice</p>
    <h1>Between models<br>and lived systems.</h1>
  </div>
</header>

<section class="section about-intro">
  <div class="shell about-intro__grid">
    <div class="about-intro__lead">
      <p class="section__eyebrow">Perspective</p>
      <h2>I follow questions across disciplinary borders.</h2>
      {% if site.data.profile.images.portrait != "" %}
        <img class="about-intro__portrait" src="{{ site.data.profile.images.portrait | relative_url }}" alt="{{ site.data.profile.images.portrait_alt }}">
      {% endif %}
    </div>
    <div class="about-intro__copy prose">
      <p>{{ site.data.profile.bio }}</p>
      <p>I think research is strongest when analytical precision meets historical memory: when we can model a system without pretending it began with the model. My projects therefore move between code, archives, theory, and collaborative design.</p>
      <p>Outside formal work, I collect the side paths that make the central path more interesting—natural systems, old media, maps, stories, and the small rituals through which communities remember themselves.</p>
    </div>
  </div>
</section>

<section class="section principles">
  <div class="shell">
    <p class="section__eyebrow">Working principles</p>
    <div class="principles__grid">
      <article><span>01</span><h3>Stay with the system</h3><p>Study relationships and feedback, not only isolated objects.</p></article>
      <article><span>02</span><h3>Make models legible</h3><p>Tools should expose meaningful choices rather than conceal them.</p></article>
      <article><span>03</span><h3>Remember the archive</h3><p>Every “new” system inherits an institutional and cultural past.</p></article>
      <article><span>04</span><h3>Build to learn</h3><p>A prototype can surface questions that abstraction alone cannot.</p></article>
    </div>
  </div>
</section>

<section class="closing closing--about">
  <div class="shell closing__inner">
    <p class="section__eyebrow">Find me elsewhere</p>
    <h2>Work in public,<br><em>conversation by default.</em></h2>
    {% include social-links.html social=site.data.profile.contact.social %}
  </div>
</section>
