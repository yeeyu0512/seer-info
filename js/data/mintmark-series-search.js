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
    let choices = [{value:"all",label:"全部系列"}], ready = false, errorText = "", searching = false, activeIndex = -1, suppressFocus = false;
    const labelFor = value => choices.find(choice => choice.value === value)?.label || choices[0].label;
    function close() {
        list.hidden = true;
        input.setAttribute("aria-expanded","false");
        input.removeAttribute("aria-activedescendant");
        searching = false;
        input.value = labelFor(select.value);
    }
    function highlight(index) {
        const buttons = [...list.querySelectorAll('[role="option"]')];
        activeIndex = index;
        buttons.forEach((button,i) => button.classList.toggle("is-active",i === index));
        if (index >= 0 && buttons[index]) {
            input.setAttribute("aria-activedescendant",buttons[index].id);
            buttons[index].scrollIntoView({block:"nearest"});
        } else input.removeAttribute("aria-activedescendant");
    }
    function choose(value) {
        if (select.value !== value) {
            select.value = value;
            select.dispatchEvent(new Event("change",{bubbles:true}));
        }
        close();
        suppressFocus = true;
        input.focus({preventScroll:true});
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
        highlight(searching && input.value.trim() && matches.length > 1 ? 1 : -1);
    }
    input.addEventListener("focus",() => {
        if (suppressFocus) return;
        if (list.hidden) { input.select(); renderList(); }
    });
    input.addEventListener("click",() => {if (list.hidden) {input.select();renderList();}});
    input.addEventListener("input",() => {searching = true;renderList();});
    input.addEventListener("keydown",event => {
        if (event.key === "Escape") {close();return;}
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
    });
    container.addEventListener("focusout",event => {
        if (!container.contains(event.relatedTarget)) close();
    });
    document.addEventListener("pointerdown",event => {
        if (!container.contains(event.target)) close();
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
