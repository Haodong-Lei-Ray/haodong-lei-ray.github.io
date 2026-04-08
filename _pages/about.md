---
permalink: /
title: "About Me"
author_profile: true
redirect_from: 
  - /about/
  - /about.html
---

<p class="cv-download-top" style="margin: 0 0 1.25rem 0; display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;">
  <a href="{{ '/files/chinese_cv.pdf' | absolute_url }}" class="btn btn--primary" role="button" target="_blank" rel="noopener noreferrer">下载中文简历 (PDF)</a>
  <a href="{{ '/files/english_cv.pdf' | absolute_url }}" class="btn btn--primary" role="button" target="_blank" rel="noopener noreferrer">Download English CV (PDF)</a>
</p>

<!-- 介绍我的当前学术状态 -->
I am currently pursuing a master student at the [PALM Laboratory](https://palm.seu.edu.cn/intro.html), [School of Software](https://cse.seu.edu.cn/), [Southeast University (SEU)](https://www.seu.edu.cn/), Nanjing, China. I enrolled in this program in 2024, driven by my passion for advancing my expertise in computer science and artificial intelligence. My tutor is [Hongsong Wang](https://hongsong-wang.github.io/).

[Email](leihaodong@seu.edu.cn): leihaodong@seu.edu.cn

WeChat: lighting870

<!-- 我的教育背景：左图标 + 右文字，一栏一栏纵向排列 -->
### Education

<div class="about-affil-list" style="display: flex; flex-direction: column; gap: 1.25rem;">

<div class="about-affil-row" style="display: flex; gap: 1rem; align-items: flex-start;">
  <img src="{{ '/images/icon/seu.png' | absolute_url }}" alt="Southeast University" width="48" height="48" style="flex-shrink: 0; width: 48px; height: 48px; object-fit: contain; margin-top: 0.15rem;" />
  <div>
    <p style="margin: 0 0 0.35rem 0;"><strong>2024 – Present:</strong> <a href="https://www.seu.edu.cn/">Southeast University (SEU)</a></p>
    <ul style="margin: 0; padding-left: 1.25rem;">
      <li>Master of Engineering, <a href="https://cse.seu.edu.cn/">School of Software</a>, <a href="https://palm.seu.edu.cn/intro.html">PALM Laboratory</a></li>
      <li>Supervisor: <a href="https://hongsong-wang.github.io/">Hongsong Wang</a></li>
    </ul>
  </div>
</div>

<div class="about-affil-row" style="display: flex; gap: 1rem; align-items: flex-start;">
  <img src="{{ '/images/icon/hnu.png' | absolute_url }}" alt="Hainan University" width="48" height="48" style="flex-shrink: 0; width: 48px; height: 48px; object-fit: contain; margin-top: 0.15rem;" />
  <div>
    <p style="margin: 0 0 0.35rem 0;"><strong>2020 – 2024:</strong> <a href="https://www.hainanu.edu.cn/">Hainan University (HNU)</a></p>
    <ul style="margin: 0; padding-left: 1.25rem;">
      <li>Bachelor of Engineering, <a href="https://cs.hainanu.edu.cn/">School of Computer Science and Technology</a></li>
    </ul>
  </div>
</div>

</div>

### Research Experience
<!-- 每条格式：序号，公司名，部门，时间 -->

<div class="about-affil-list" style="display: flex; flex-direction: column; gap: 1.25rem;">

<div class="about-affil-row" style="display: flex; gap: 1rem; align-items: flex-start;">
  <img src="{{ '/images/icon/ailab.png' | absolute_url }}" alt="Shanghai Artificial Intelligence Laboratory" width="48" height="48" style="flex-shrink: 0; width: 48px; height: 48px; object-fit: contain; margin-top: 0.15rem;" />
  <div>
    <p style="margin: 0 0 0.35rem 0;"><a href="https://www.shlab.org.cn/">Shanghai Artificial Intelligence Laboratory</a>（上海人工智能实验室）, Research intern, 2025.10 – Now</p>
    <ul style="margin: 0; padding-left: 1.25rem;">
      <li>Supervisor: <a href="https://dw2283.github.io/wangding.github.io/">Ding Wang</a></li>
    </ul>
  </div>
</div>

<div class="about-affil-row" style="display: flex; gap: 1rem; align-items: flex-start;">
  <img src="{{ '/images/icon/smu.png' | absolute_url }}" alt="Singapore Management University" width="48" height="48" style="flex-shrink: 0; width: 48px; height: 48px; object-fit: contain; margin-top: 0.15rem;" />
  <div>
    <p style="margin: 0 0 0.35rem 0;"><a href="https://www.smu.edu.sg/">Singapore Management University</a>, <a href="https://www.lv-lab.org/SMU/index.html">LV lab</a>, Visiting student, 2024.07 – 2025.03</p>
    <ul style="margin: 0; padding-left: 1.25rem;">
      <li>Supervisor: <a href="https://panzhous.github.io/">Pan Zhou</a></li>
    </ul>
  </div>
</div>

</div>

### Publications
<!-- preprints-sync:start (do not edit manually; run sync_preprints_to_site.py) -->
{% include preprints-from-preprintstxt.html %}
<!-- preprints-sync:end -->

<!-- #### Published
EasyTune: Efficient Step-Aware Fine-Tuning for Diffusion-Based Motion Generation (NeurIPS25 Submitted, Second Author)

MAS-UNet: A U-shaped Network for Prostate Segmentation (Frontiers in Medicine, SCI Q3) -->

### Blogs
1. [研究Agent的第一篇：CoT、ToT、GoT\&MLLM CoT](https://zhuanlan.zhihu.com/p/718082987)
2. [Why is Deepseek? 研究DeepSeek的第一篇](https://zhuanlan.zhihu.com/p/20930750671)

<!-- ### Current Research
#### Speculative Sampling (2024/9 ~ Present)
I am currently focusing on Speculative Sampling, a novel technique designed to accelerate the decoding process in large language models. This method leverages a smaller, faster draft model to generate multiple tokens simultaneously, which are then verified and refined by a larger target model in a single pass. By aligning the output distribution with that of the target model, Speculative Sampling significantly improves computational efficiency without sacrificing accuracy, making it a promising approach for optimizing real-time AI applications, such as natural language generation.

### Research Experience
During 2024, I conducted research on AI Agents, exploring how artificial intelligence can be leveraged to create systems capable of autonomous decision-making and task execution. This experience ignited my interest in AI and its practical applications. Currently, as a Master’s student, I am focusing on Speculative Sampling, a cutting-edge technique aimed at enhancing the efficiency and accuracy of machine learning models, particularly in large language models. My work at the PALM Laboratory allows me to contribute to innovative solutions in pattern learning and data mining. -->
