let nextListId = 0;

export function matchingMintmarkSeries(choices, query) {
    const key = query.trim().toLocaleLowerCase();
    return choices.filter(choice => choice.value === "all"
        || choice.label.toLocaleLowerCase().includes(key) || choice.value.includes(key));
}

// 單一欄位同時支援輸入系列名稱／編號與點選清單；原 select 保留篩選值供既有流程使用。
export function createMintmarkSeriesSearch(container) {
    const input = container.querySelector("input");
    const select = container.querySelector("select");
    const list = container.querySelector('[role="listbox"]');
    const listId = `mint-series-options-${++nextListId}`;
    list.id = listId;
    input.setAttribute("aria-controls",listId);
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "mint-series-toggle";
    toggle.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
    toggle.setAttribute("aria-label","展開或收合系列選單");
    toggle.setAttribute("role","combobox");
    toggle.setAttribute("aria-haspopup","listbox");
    toggle.setAttribute("aria-controls",listId);
    toggle.setAttribute("aria-expanded","false");
    input.after(toggle);
    let focusTarget = input;
    let choices = [{value:"all",label:"全部系列"}], ready = false, errorText = "", searching = false, activeIndex = -1, suppressFocus = false;
    const labelFor = value => choices.find(choice => choice.value === value)?.label || choices[0].label;
    function close() {
        list.hidden = true;
        input.setAttribute("aria-expanded","false");
        toggle.setAttribute("aria-expanded","false");
        input.removeAttribute("aria-activedescendant");
        toggle.removeAttribute("aria-activedescendant");
        searching = false;
        input.value = labelFor(select.value);
    }
    function highlight(index) {
        const buttons = [...list.querySelectorAll('[role="option"]')];
        activeIndex = index;
        buttons.forEach((button,i) => button.classList.toggle("is-active",i === index));
        if (index >= 0 && buttons[index]) {
            focusTarget.setAttribute("aria-activedescendant",buttons[index].id);
            buttons[index].scrollIntoView({block:"nearest"});
        } else {
            input.removeAttribute("aria-activedescendant");
            toggle.removeAttribute("aria-activedescendant");
        }
    }
    function choose(value) {
        if (select.value !== value) {
            select.value = value;
            select.dispatchEvent(new Event("change",{bubbles:true}));
        }
        close();
        suppressFocus = true;
        focusTarget.focus({preventScroll:true});
        suppressFocus = false;
    }
    function renderList() {
        const matches = matchingMintmarkSeries(choices,searching ? input.value : "");
        const options = matches.map((choice,index) => {
            const button = document.createElement("button");
            button.type = "button";
            button.id = `${listId}-${index}`;
            button.setAttribute("role","option");
            button.setAttribute("aria-selected",String(choice.value === select.value));
            button.textContent = choice.label;
            button.addEventListener("click",() => choose(choice.value));
            return button;
        });
        if (!ready || errorText) {
            const loading = document.createElement("span");
            loading.className = "mint-series-loading";
            loading.textContent = errorText || "系列載入中…";
            options.push(loading);
        }
        list.replaceChildren(...options);
        list.hidden = false;
        input.setAttribute("aria-expanded","true");
        toggle.setAttribute("aria-expanded","true");
        highlight(searching && input.value.trim() && matches.length > 1 ? 1 : -1);
    }
    input.addEventListener("focus",() => {
        focusTarget = input;
        if (suppressFocus) return;
        input.select();
        renderList();
    });
    input.addEventListener("click",() => {if (list.hidden) {input.select();renderList();}});
    input.addEventListener("input",() => {searching = true;renderList();});
    toggle.addEventListener("click",() => {
        focusTarget = toggle;
        toggle.focus({preventScroll:true});
        if (list.hidden) { searching = false; renderList(); }
        else close();
    });
    function onKeydown(event) {
        focusTarget = event.currentTarget;
        if (event.key === "Escape") {close();return;}
        if (event.key === "Tab") {close();return;}
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (list.hidden) renderList();
            const count = list.querySelectorAll('[role="option"]').length;
            highlight(activeIndex < 0 ? (event.key === "ArrowDown" ? 0 : count - 1)
                : (activeIndex + (event.key === "ArrowDown" ? 1 : count - 1)) % count);
        } else if (event.key === "Enter" && !list.hidden) {
            event.preventDefault();
            list.querySelectorAll('[role="option"]')[activeIndex >= 0 ? activeIndex : 0]?.click();
        }
    }
    input.addEventListener("keydown",onKeydown);
    toggle.addEventListener("keydown",onKeydown);
    // 點擊清單捲軸可能讓輸入框失焦，但仍是在操作清單，不應因此關閉。
    document.addEventListener("pointerdown",event => {
        if (container.contains(event.target)) return;
        if (!list.hidden) {
            const bounds = list.getBoundingClientRect();
            if (event.clientX >= bounds.left && event.clientX <= bounds.right
                && event.clientY >= bounds.top && event.clientY <= bounds.bottom) return;
        }
        close();
    });
    return {
        setOptions(next) {
            const wasOpen = !list.hidden;
            const selected = select.value;
            choices = next;
            ready = true;
            errorText = "";
            select.replaceChildren(...choices.map(choice => new Option(choice.label,choice.value)));
            select.value = choices.some(choice => choice.value === selected) ? selected : "all";
            if (wasOpen) renderList();
            else close();
        },
        setError(message) {
            ready = true;
            errorText = message;
            if (!list.hidden) renderList();
        }
    };
}
