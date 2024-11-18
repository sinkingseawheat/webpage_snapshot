'use client'

import {useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import styles from '@/component/snapshot/Renderer/style/FormInput.module.scss';

import { browerContextDefaultFormFieldValue } from '../api/FormData';

// シナリオに関するフォームデータ

/** Scenarioに関連するフォームデータのname */
const sNames = ['urlsToOpen', 'scenarioIds', 'referer'] as const;
/** Scenarioに関連するフォームデータのデフォルト値 */
const scenarioDefaultFormFieldValue:Record<typeof sNames[number], string> = (()=>{
  const temporary = sNames.map((item)=>[item,'']);
  return Object.fromEntries(temporary);
})();

type FormData = typeof browerContextDefaultFormFieldValue & typeof scenarioDefaultFormFieldValue;

const defaultValues:Required<FormData> = {
  ...browerContextDefaultFormFieldValue,
  ...scenarioDefaultFormFieldValue,
};

export { scenarioDefaultFormFieldValue };

// レンダラー

const InputForm:React.FC<{}> = ()=>{

  const {
    register,
    handleSubmit,
    formState:{isValid, isDirty, errors, touchedFields},
  }
  = useForm<FormData>({
    mode:'onTouched',
    defaultValues: {...defaultValues,   ...{
      //Todo: 重い処理ではないと思うが、1回だけ走るようにする予定
      urlsToOpen: localStorage.getItem('snapshot-urlsToOpen') || '',
      viewportWidth: localStorage.getItem('snapshot-viewportWidth') || '',
      viewportHeight: localStorage.getItem('snapshot-viewportHeight') || '',
    }}
  });

  const onSubmit : SubmitHandler<FormData> = async (data, e) => {
    try{
      localStorage.setItem('snapshot-urlsToOpen', data.urlsToOpen);
      window.localStorage.setItem('snapshot-viewportWidth', data.viewportWidth);
      window.localStorage.setItem('snapshot-viewportHeight', data.viewportHeight);
    }catch(e){
      throw new Error(`localstorageが満杯です`)
    }
    try{
      const response = await fetch('/api/snapshot/post', {
        'method': 'POST',
        'cache': 'no-store',
        'body':JSON.stringify(data),
      });
      console.log(`-- sent data --`);
      console.log(data);
      console.log(`-- received data --`);
      response.json().then((json)=>{
        console.log(json);
      });
    }catch(e){

    }finally{
    }
  };

  const FormItemMessage:React.FC<{name:keyof FormData}> = (props) =>{
    const _isErrMessage = !!errors?.[props.name];
    const _errMessage = errors?.[props.name]?.message;
    const _isTouched = touchedFields?.[props.name];
    return (
      <p className={`
        ${styles.message}
        ${_isErrMessage ? `${styles['-error']}` : ''}
        ${_isTouched ? `${styles['-touched']}` : ''}`}
      ><span className='message_i'>{_isErrMessage ? `❌${_errMessage}` : '✅問題ありません'}</span></p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <label>
        <span className='labelName'>対象のURL（必須）</span>
        <textarea className={styles.textarea}
          placeholder='URLを改行区切りで入力してください'
          {...register('urlsToOpen',{
            required:`URLの入力は必須です`,
            validate:(value)=>{
              const MAX_URL_NUM = 1000;
              const numberOfLines = value?.split('\n').filter(line=>!/^\s*$/.test(line)).length;
              return numberOfLines === undefined || numberOfLines <= MAX_URL_NUM || `URLの最大数は${MAX_URL_NUM}です`;
            }
          })}></textarea>
      </label>
      <FormItemMessage name='urlsToOpen'/>
      <fieldset className={styles.fieldsetGroup}>
        <legend>ビューポート</legend>
        <label>
          <span className='labelName'>幅（必須）</span>
          <input type="text" {...register('viewportWidth',{
            required:`幅の入力は必須です`,
            pattern: {
              value: /^[1-9]\d*$/,
              message: `先頭が0以外の半角数字で入力してください`
            }
          })} />
        </label>
        <FormItemMessage name='viewportWidth'/>
        <label>
          <span className='labelName'>高さ（必須）</span>
          <input type="text" {...register('viewportHeight',{
            required:`高さの入力は必須です`,
            pattern: {
              value: /^[1-9]\d*$/,
              message: `先頭が0以外の半角数字で入力してください`
            }
          })} />
        </label>
        <FormItemMessage name='viewportHeight'/>
      </fieldset>
      <fieldset className={styles.fieldsetGroup}>
        <legend>ユーザーエージェント</legend>
        {
          [
            {labelName:'設定なし',value:''},
            {labelName:'PC',value:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'},
          ].map((item)=>{
          return (
            <label key={item.value}>
              <input type="radio" value={item.value} {
                ...register('userAgent')
              } defaultChecked={item.value === defaultValues?.userAgent} />
              <span className='labelName'>{item.labelName}</span>
            </label>
          );
        })}
        <FormItemMessage name='userAgent'/>
      </fieldset>
      <fieldset className={styles.fieldsetGroup}>
        <legend>リファラー</legend>
        {
          [
            {labelName:'設定なし',value:defaultValues.referer},
          ].map((item)=>{
            return (
              <label key={item.value}>
                <input type="radio" value={item.value} {...register('referer')} defaultChecked={item.value === defaultValues.referer}/>
                <span className="labelName">{item.labelName}</span>
              </label>
            );
          })
        }
        <FormItemMessage name='referer' />
      </fieldset>
      <input type='submit' className={styles.submitButton} disabled={!isValid} />
    </form>
  );
}

export default InputForm;